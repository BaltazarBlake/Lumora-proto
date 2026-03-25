// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

interface IVaultManagerAdapter {
    function idleBalances() external view returns (uint256 idleAsset0, uint256 idleAsset1);

    function syncAccountedAssets(uint256 newAccountedAsset0, uint256 newAccountedAsset1) external;

    function transferToManager(address token, uint256 amount) external;
}

interface INonfungiblePositionManagerMinimal {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function mint(MintParams calldata params)
        external
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params) external returns (uint256 amount0, uint256 amount1);

    function burn(uint256 tokenId) external payable;

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
}

contract Manager is Ownable, Pausable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20Metadata;

    error InvalidAddress();
    error InvalidOperator();
    error PoolNotInitialized();
    error PositionAlreadyExists();
    error PositionNotFound();
    error RebalanceTooSoon();

    struct SeedPositionParams {
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct RebalanceParams {
        int24 tickLower;
        int24 tickUpper;
        uint256 exitAmount0Min;
        uint256 exitAmount1Min;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct PositionState {
        uint256 tokenId;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        int24 currentTick;
        bool inRange;
        uint256 lastRebalanceAt;
        address pool;
    }

    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);
    event PositionSeeded(uint256 indexed tokenId, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event Rebalanced(
        uint256 indexed previousTokenId,
        uint256 indexed newTokenId,
        int24 previousTickLower,
        int24 previousTickUpper,
        int24 nextTickLower,
        int24 nextTickUpper,
        uint256 amount0Used,
        uint256 amount1Used
    );

    IVaultManagerAdapter public immutable vault;
    INonfungiblePositionManagerMinimal public immutable positionManager;
    IUniswapV3Factory public immutable factory;
    IERC20Metadata public immutable token0;
    IERC20Metadata public immutable token1;
    uint24 public immutable poolFee;
    uint256 public immutable minimumRebalanceInterval;

    address public operator;
    uint256 public positionTokenId;
    int24 public positionTickLower;
    int24 public positionTickUpper;
    uint256 public lastRebalanceAt;
    uint256 public deployedAmount0;
    uint256 public deployedAmount1;

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) {
            revert InvalidOperator();
        }
        _;
    }

    constructor(
        address initialOwner,
        address initialOperator,
        address vaultAddress,
        address positionManagerAddress,
        address factoryAddress,
        address token0Address,
        address token1Address,
        uint24 poolFee_,
        uint256 minimumRebalanceInterval_
    ) {
        if (
            initialOwner == address(0) || initialOperator == address(0) || vaultAddress == address(0)
                || positionManagerAddress == address(0) || factoryAddress == address(0) || token0Address == address(0)
                || token1Address == address(0)
        ) {
            revert InvalidAddress();
        }

        _transferOwnership(initialOwner);
        vault = IVaultManagerAdapter(vaultAddress);
        positionManager = INonfungiblePositionManagerMinimal(positionManagerAddress);
        factory = IUniswapV3Factory(factoryAddress);
        token0 = IERC20Metadata(token0Address);
        token1 = IERC20Metadata(token1Address);
        poolFee = poolFee_;
        minimumRebalanceInterval = minimumRebalanceInterval_;
        operator = initialOperator;
    }

    function seedPosition(SeedPositionParams calldata params)
        external
        onlyOperator
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        if (positionTokenId != 0) {
            revert PositionAlreadyExists();
        }

        _requirePoolInitialized();
        _pullFromVault(params.amount0Desired, params.amount1Desired);
        (tokenId, liquidity, amount0, amount1) = _mintPosition(
            params.tickLower,
            params.tickUpper,
            params.amount0Desired,
            params.amount1Desired,
            params.amount0Min,
            params.amount1Min,
            params.deadline
        );

        _setPosition(tokenId, params.tickLower, params.tickUpper, amount0, amount1);
        _returnResidualToVault();
        _syncVaultAccountedAssets(amount0, amount1);

        emit PositionSeeded(tokenId, params.tickLower, params.tickUpper, liquidity, amount0, amount1);
    }

    function collectFeesToVault() external onlyOperator whenNotPaused nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (positionTokenId == 0) {
            revert PositionNotFound();
        }

        INonfungiblePositionManagerMinimal.CollectParams memory params = INonfungiblePositionManagerMinimal.CollectParams({
            tokenId: positionTokenId,
            recipient: address(vault),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (amount0, amount1) = positionManager.collect(params);
        _syncVaultAccountedAssetsFromPosition();

        emit FeesCollected(positionTokenId, amount0, amount1);
    }

    function rebalance(RebalanceParams calldata params)
        external
        onlyOperator
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        if (positionTokenId == 0) {
            revert PositionNotFound();
        }
        if (block.timestamp < lastRebalanceAt + minimumRebalanceInterval) {
            revert RebalanceTooSoon();
        }

        uint256 previousTokenId = positionTokenId;
        int24 previousTickLower = positionTickLower;
        int24 previousTickUpper = positionTickUpper;

        _exitCurrentPosition(params.exitAmount0Min, params.exitAmount1Min, params.deadline);

        (uint256 idleAsset0, uint256 idleAsset1) = vault.idleBalances();
        _pullFromVault(idleAsset0, idleAsset1);

        uint256 available0 = token0.balanceOf(address(this));
        uint256 available1 = token1.balanceOf(address(this));

        (tokenId, liquidity, amount0, amount1) = _mintPosition(
            params.tickLower,
            params.tickUpper,
            available0,
            available1,
            params.amount0Min,
            params.amount1Min,
            params.deadline
        );

        _setPosition(tokenId, params.tickLower, params.tickUpper, amount0, amount1);
        _returnResidualToVault();
        _syncVaultAccountedAssets(amount0, amount1);

        emit Rebalanced(
            previousTokenId,
            tokenId,
            previousTickLower,
            previousTickUpper,
            params.tickLower,
            params.tickUpper,
            amount0,
            amount1
        );
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) {
            revert InvalidOperator();
        }

        emit OperatorUpdated(operator, newOperator);
        operator = newOperator;
    }

    function positionState() external view returns (PositionState memory state) {
        if (positionTokenId == 0) {
            return PositionState({
                tokenId: 0,
                tickLower: 0,
                tickUpper: 0,
                liquidity: 0,
                currentTick: 0,
                inRange: false,
                lastRebalanceAt: lastRebalanceAt,
                pool: _poolAddress()
            });
        }

        (, , , , , , , uint128 liquidity, , , ,) = positionManager.positions(positionTokenId);
        int24 currentTick = _currentTick();

        state = PositionState({
            tokenId: positionTokenId,
            tickLower: positionTickLower,
            tickUpper: positionTickUpper,
            liquidity: liquidity,
            currentTick: currentTick,
            inRange: currentTick >= positionTickLower && currentTick <= positionTickUpper,
            lastRebalanceAt: lastRebalanceAt,
            pool: _poolAddress()
        });
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function sweepResidualToVault() external onlyOperator nonReentrant {
        _returnResidualToVault();
        _syncVaultAccountedAssetsFromPosition();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _mintPosition(
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 deadline
    ) internal returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
        _approveIfNeeded(token0, amount0Desired);
        _approveIfNeeded(token1, amount1Desired);

        INonfungiblePositionManagerMinimal.MintParams memory params = INonfungiblePositionManagerMinimal.MintParams({
            token0: address(token0),
            token1: address(token1),
            fee: poolFee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            recipient: address(this),
            deadline: deadline
        });

        (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);
    }

    function _exitCurrentPosition(uint256 amount0Min, uint256 amount1Min, uint256 deadline)
        internal
        returns (uint256 amount0Collected, uint256 amount1Collected)
    {
        (, , , , , , , uint128 liquidity, , , ,) = positionManager.positions(positionTokenId);

        if (liquidity > 0) {
            INonfungiblePositionManagerMinimal.DecreaseLiquidityParams memory decreaseParams =
                INonfungiblePositionManagerMinimal.DecreaseLiquidityParams({
                    tokenId: positionTokenId,
                    liquidity: liquidity,
                    amount0Min: amount0Min,
                    amount1Min: amount1Min,
                    deadline: deadline
                });

            positionManager.decreaseLiquidity(decreaseParams);
        }

        INonfungiblePositionManagerMinimal.CollectParams memory collectParams = INonfungiblePositionManagerMinimal.CollectParams({
            tokenId: positionTokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (amount0Collected, amount1Collected) = positionManager.collect(collectParams);
        positionManager.burn(positionTokenId);
        positionTokenId = 0;
        deployedAmount0 = 0;
        deployedAmount1 = 0;
    }

    function _setPosition(uint256 tokenId, int24 tickLower, int24 tickUpper, uint256 amount0, uint256 amount1) internal {
        positionTokenId = tokenId;
        positionTickLower = tickLower;
        positionTickUpper = tickUpper;
        lastRebalanceAt = block.timestamp;
        deployedAmount0 = amount0;
        deployedAmount1 = amount1;
    }

    function _pullFromVault(uint256 amount0, uint256 amount1) internal {
        if (amount0 > 0) {
            vault.transferToManager(address(token0), amount0);
        }
        if (amount1 > 0) {
            vault.transferToManager(address(token1), amount1);
        }
    }

    function _returnResidualToVault() internal {
        uint256 residual0 = token0.balanceOf(address(this));
        uint256 residual1 = token1.balanceOf(address(this));

        if (residual0 > 0) {
            token0.safeTransfer(address(vault), residual0);
        }
        if (residual1 > 0) {
            token1.safeTransfer(address(vault), residual1);
        }
    }

    function _syncVaultAccountedAssets(uint256 nextDeployedAmount0, uint256 nextDeployedAmount1) internal {
        (uint256 idleAsset0, uint256 idleAsset1) = vault.idleBalances();
        vault.syncAccountedAssets(idleAsset0 + nextDeployedAmount0, idleAsset1 + nextDeployedAmount1);
    }

    function _syncVaultAccountedAssetsFromPosition() internal {
        (uint256 idleAsset0, uint256 idleAsset1) = vault.idleBalances();
        if (positionTokenId == 0) {
            vault.syncAccountedAssets(idleAsset0, idleAsset1);
        } else {
            vault.syncAccountedAssets(idleAsset0 + deployedAmount0, idleAsset1 + deployedAmount1);
        }
    }

    function _approveIfNeeded(IERC20Metadata token, uint256 requiredAmount) internal {
        if (token.allowance(address(this), address(positionManager)) < requiredAmount) {
            token.forceApprove(address(positionManager), type(uint256).max);
        }
    }

    function _currentTick() internal view returns (int24 tick) {
        address poolAddress = _poolAddress();
        if (poolAddress == address(0)) {
            return 0;
        }

        (, tick, , , , ,) = IUniswapV3Pool(poolAddress).slot0();
    }

    function _poolAddress() internal view returns (address) {
        return factory.getPool(address(token0), address(token1), poolFee);
    }

    function _requirePoolInitialized() internal view {
        if (_poolAddress() == address(0)) {
            revert PoolNotInitialized();
        }
    }
}
