// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH9 is ERC20 {
    error EthTransferFailed();
    error BurnAmountExceedsBalance();

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() ERC20("Wrapped Ether", "WETH") {}

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (balanceOf(msg.sender) < amount) {
            revert BurnAmountExceedsBalance();
        }

        _burn(msg.sender, amount);

        (bool sent,) = payable(msg.sender).call{value: amount}("");
        if (!sent) {
            revert EthTransferFailed();
        }

        emit Withdrawal(msg.sender, amount);
    }
}
