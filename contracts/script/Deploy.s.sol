// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {SimpleAccountFactory} from "account-abstraction/accounts/SimpleAccountFactory.sol";
import {BatchMintTokenFactory} from "../src/BatchMintTokenFactory.sol";

contract DeployScript is Script {
    EntryPoint entryPoint;
    SimpleAccountFactory simpleAccountFactoryFactory;
    BatchMintTokenFactory batchMintTokenFactory;

    function setUp() public {}

    function run() public returns (BatchMintTokenFactory) {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        entryPoint = new EntryPoint();
        console.log("EntryPoint: %s", address(entryPoint));

        simpleAccountFactoryFactory = new SimpleAccountFactory(
            IEntryPoint(address(entryPoint))
        );
        console.log(
            "SimpleAccountFactory: %s",
            address(simpleAccountFactoryFactory)
        );

        batchMintTokenFactory = new BatchMintTokenFactory();
        console.log(
            "BatchMintTokenFactory: %s",
            address(batchMintTokenFactory)
        );

        vm.stopBroadcast();

        return batchMintTokenFactory;
    }
}
