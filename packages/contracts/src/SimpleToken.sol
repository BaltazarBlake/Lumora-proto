// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleToken is ERC20, Ownable {
    uint8 private constant TOKEN_DECIMALS = 6;

    constructor(address initialOwner, address initialHolder, uint256 initialSupply) ERC20("SimpleToken", "STK") {
        _transferOwnership(initialOwner);
        _mint(initialHolder, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
