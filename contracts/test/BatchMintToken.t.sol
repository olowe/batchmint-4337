// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {BatchMintToken} from "../src/BatchMintToken.sol";

contract BatchMintTokenTest is Test {
    string name = "BatchMintToken";
    string symbol = "BMT";
    uint256 totalSupply = 1_000_000;
    address creator = address(0x1);

    function test_Deployment() public {
        BatchMintToken token = new BatchMintToken(
            name,
            symbol,
            totalSupply,
            creator
        );

        uint256 expectedTotalSupply = totalSupply * (10 ** token.decimals());

        assertEq(token.name(), name);
        assertEq(token.symbol(), symbol);
        assertEq(token.totalSupply(), expectedTotalSupply);
        assertEq(token.balanceOf(creator), expectedTotalSupply);
        assertEq(token.owner(), creator);
    }
}
