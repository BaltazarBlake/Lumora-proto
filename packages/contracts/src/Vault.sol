// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vault is ERC20, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    error InvalidAsset();
    error InvalidReceiver();
    error ZeroDeposit();
    error ZeroShares();
    error InsufficientIdleBalance();
    error UnauthorizedManager();

    event Deposited(address indexed caller, address indexed receiver, uint256 amount0, uint256 amount1, uint256 shares);
    event Withdrawn(address indexed caller, address indexed receiver, address indexed owner, uint256 shares, uint256 amount0, uint256 amount1);
    event ManagerUpdated(address indexed previousManager, address indexed newManager);
    event AccountedAssetsSynced(uint256 accountedAsset0, uint256 accountedAsset1);
    event ManagerTransfer(address indexed token, uint256 amount);

    IERC20Metadata public immutable asset0;
    IERC20Metadata public immutable asset1;
    uint8 private immutable asset0Decimals;
    uint8 private immutable asset1Decimals;

    address public manager;
    uint256 public accountedAsset0;
    uint256 public accountedAsset1;

    modifier onlyManager() {
        if (msg.sender != manager) {
            revert UnauthorizedManager();
        }
        _;
    }

    constructor(
        address asset0_,
        address asset1_,
        address initialOwner,
        address initialManager
    ) ERC20("AI ALM Vault Share", "AAVS") {
        if (asset0_ == address(0) || asset1_ == address(0) || asset0_ == asset1_) {
            revert InvalidAsset();
        }

        _transferOwnership(initialOwner);
        asset0 = IERC20Metadata(asset0_);
        asset1 = IERC20Metadata(asset1_);
        asset0Decimals = IERC20Metadata(asset0_).decimals();
        asset1Decimals = IERC20Metadata(asset1_).decimals();
        manager = initialManager;
    }

    function deposit(uint256 amount0, uint256 amount1, address receiver)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        if (receiver == address(0)) {
            revert InvalidReceiver();
        }
        if (amount0 == 0 && amount1 == 0) {
            revert ZeroDeposit();
        }

        uint256 totalValueBefore = totalAccountedValue();
        uint256 depositValue = _toWad(amount0, asset0Decimals) + _toWad(amount1, asset1Decimals);

        if (totalSupply() == 0) {
            shares = depositValue;
        } else {
            shares = (depositValue * totalSupply()) / totalValueBefore;
        }

        if (shares == 0) {
            revert ZeroShares();
        }

        if (amount0 > 0) {
            asset0.safeTransferFrom(msg.sender, address(this), amount0);
            accountedAsset0 += amount0;
        }
        if (amount1 > 0) {
            asset1.safeTransferFrom(msg.sender, address(this), amount1);
            accountedAsset1 += amount1;
        }

        _mint(receiver, shares);

        emit Deposited(msg.sender, receiver, amount0, amount1, shares);
        emit AccountedAssetsSynced(accountedAsset0, accountedAsset1);
    }

    function withdraw(uint256 shares, address receiver, address owner)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        if (receiver == address(0) || owner == address(0)) {
            revert InvalidReceiver();
        }
        if (shares == 0) {
            revert ZeroShares();
        }

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        uint256 supply = totalSupply();
        amount0 = (accountedAsset0 * shares) / supply;
        amount1 = (accountedAsset1 * shares) / supply;

        if (asset0.balanceOf(address(this)) < amount0 || asset1.balanceOf(address(this)) < amount1) {
            revert InsufficientIdleBalance();
        }

        accountedAsset0 -= amount0;
        accountedAsset1 -= amount1;

        _burn(owner, shares);

        if (amount0 > 0) {
            asset0.safeTransfer(receiver, amount0);
        }
        if (amount1 > 0) {
            asset1.safeTransfer(receiver, amount1);
        }

        emit Withdrawn(msg.sender, receiver, owner, shares, amount0, amount1);
        emit AccountedAssetsSynced(accountedAsset0, accountedAsset1);
    }

    function setManager(address newManager) external onlyOwner {
        emit ManagerUpdated(manager, newManager);
        manager = newManager;
    }

    function syncAccountedAssets(uint256 newAccountedAsset0, uint256 newAccountedAsset1) external onlyManager {
        accountedAsset0 = newAccountedAsset0;
        accountedAsset1 = newAccountedAsset1;

        emit AccountedAssetsSynced(accountedAsset0, accountedAsset1);
    }

    function transferToManager(address token, uint256 amount) external onlyManager whenNotPaused {
        if (token != address(asset0) && token != address(asset1)) {
            revert InvalidAsset();
        }

        IERC20Metadata(token).safeTransfer(manager, amount);
        emit ManagerTransfer(token, amount);
    }

    function totalAccountedValue() public view returns (uint256) {
        return _toWad(accountedAsset0, asset0Decimals) + _toWad(accountedAsset1, asset1Decimals);
    }

    function idleBalances() external view returns (uint256 idleAsset0, uint256 idleAsset1) {
        idleAsset0 = asset0.balanceOf(address(this));
        idleAsset1 = asset1.balanceOf(address(this));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _toWad(uint256 amount, uint8 decimals_) private pure returns (uint256) {
        if (decimals_ == 18) {
            return amount;
        }

        if (decimals_ < 18) {
            return amount * (10 ** (18 - decimals_));
        }

        return amount / (10 ** (decimals_ - 18));
    }
}
