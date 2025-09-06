// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BatchMintToken is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, address creator_)
        ERC20(name_, symbol_)
        Ownable(creator_)
    {
        _mint(creator_, totalSupply_ * (10 ** decimals()));
    }
}
