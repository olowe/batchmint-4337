// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {BatchMintToken} from "../src/BatchMintToken.sol";

contract BatchMintTokenScript is Script {
    BatchMintToken public batchMintToken;

    function setUp() public {}

    function run() public {
        string memory name = "BatchMintToken";
        string memory symbol = "BMT";
        uint256 totalSupply = 1_000_000;

        vm.startBroadcast();

        batchMintToken = new BatchMintToken(
            name,
            symbol,
            totalSupply,
            address(this)
        );

        vm.stopBroadcast();
    }
}
