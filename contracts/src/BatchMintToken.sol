// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./openzeppelin-contracts/ERC20.sol";

contract BatchMintToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address creator_
    ) ERC20(name_, symbol_) {
        _mint(creator_, totalSupply_ * (10 ** decimals()));
    }
}
