// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {BatchMintToken} from "./BatchMintToken.sol";

struct TokenParam {
    string name;
    string symbol;
    uint256 totalSupply;
}

contract BatchMintTokenFactory {
    event TokenDeployed(
        address indexed creator,
        address indexed token,
        string name,
        string symbol
    );
    event TokenSkipped(
        address indexed creator,
        string name,
        string symbol,
        string reason
    );

    mapping(address => mapping(bytes32 => bool)) public deployedTokens;

    function _createUserTokenKey(
        string memory name_,
        string memory symbol_
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(name_, symbol_));
    }

    function deployTokens(
        TokenParam[] memory params_
    ) external returns (address[] memory) {
        address[] memory newTokens = new address[](params_.length);

        for (uint256 i = 0; i < params_.length; i++) {
            // Get params of new token
            string memory newTokenName = params_[i].name;
            string memory newTokenSymbol = params_[i].symbol;
            uint256 newTokenTotalSupply = params_[i].totalSupply;

            // Create unique token key for user
            bytes32 tokenKey = _createUserTokenKey(
                newTokenName,
                newTokenSymbol
            );

            // Skip duplicate tokens
            if (deployedTokens[msg.sender][tokenKey]) {
                emit TokenSkipped(
                    msg.sender,
                    newTokenName,
                    newTokenSymbol,
                    "Already deployed"
                );
                continue;
            }

            // Deploy token
            BatchMintToken token = new BatchMintToken(
                newTokenName,
                newTokenSymbol,
                newTokenTotalSupply,
                msg.sender
            );

            // Get new token address
            address tokenAddress = address(token);

            // Record token deployment for user
            deployedTokens[msg.sender][tokenKey] = true;

            // Log event
            emit TokenDeployed(
                msg.sender,
                tokenAddress,
                newTokenName,
                newTokenSymbol
            );

            // Store token address
            newTokens[i] = tokenAddress;
        }

        return newTokens;
    }

    function getUserToken(
        address user_,
        string memory tokenName_,
        string memory tokenSymbol_
    ) external view returns (bool) {
        bytes32 expectedTokenKey = _createUserTokenKey(
            tokenName_,
            tokenSymbol_
        );

        return deployedTokens[user_][expectedTokenKey];
    }
}
