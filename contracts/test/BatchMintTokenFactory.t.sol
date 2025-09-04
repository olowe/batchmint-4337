// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "../src/openzeppelin-contracts/IERC20.sol";
import {BatchMintToken} from "../src/BatchMintToken.sol";
import {BatchMintTokenFactory, TokenParam} from "../src/BatchMintTokenFactory.sol";

contract BatchMintTokenFactoryTest is Test {
    BatchMintTokenFactory public batchMintTokenFactory;

    uint256 totalSupply = 1_000_000;

    string tokenName1 = "BatchMintTokenOne";
    string tokenSymbol1 = "BMTONE";
    TokenParam tokenParam1 = TokenParam(tokenName1, tokenSymbol1, totalSupply);

    string tokenName2 = "BatchMintTokenTwo";
    string tokenSymbol2 = "BMTTWO";
    TokenParam tokenParam2 = TokenParam(tokenName2, tokenSymbol2, totalSupply);

    function setUp() public {
        batchMintTokenFactory = new BatchMintTokenFactory();
    }

    function test_UserCanDeployMultipleUniqueTokens() public {
        // Arrange
        TokenParam[] memory tokenParams = new TokenParam[](2);
        tokenParams[0] = tokenParam1;
        tokenParams[1] = tokenParam2;

        // Act
        _expectTransfer(address(0xa), address(this), totalSupply * (10 ** 18));
        _expectTokenDeployed(
            address(this),
            address(0xa),
            tokenName1,
            tokenSymbol1
        );

        _expectTransfer(address(0xb), address(this), totalSupply * (10 ** 18));
        _expectTokenDeployed(
            address(this),
            address(0xb),
            tokenName2,
            tokenSymbol2
        );

        address[] memory deployedTokens = batchMintTokenFactory.deployTokens(
            tokenParams
        );

        // Assert
        assertEq(deployedTokens.length, 2);

        _assertValidTokenProps(
            deployedTokens[0],
            tokenName1,
            tokenSymbol1,
            totalSupply,
            address(this)
        );

        _assertValidTokenProps(
            deployedTokens[1],
            tokenName2,
            tokenSymbol2,
            totalSupply,
            address(this)
        );

        _assertTokenDeployedForUser(address(this), tokenName1, tokenSymbol1);
        _assertTokenDeployedForUser(address(this), tokenName2, tokenSymbol2);
    }

    function test_UserDeploysDuplicateToken_SkipsSecond() public {
        // Arrange
        TokenParam[] memory tokenParams = new TokenParam[](2);
        tokenParams[0] = tokenParam1;
        tokenParams[1] = tokenParam1;

        // Act
        _expectTransfer(address(0xa), address(this), totalSupply * (10 ** 18));
        _expectTokenDeployed(
            address(this),
            address(0xa),
            tokenName1,
            tokenSymbol1
        );

        _expectTokenSkipped(
            address(this),
            tokenName1,
            tokenSymbol1,
            "Already deployed"
        );

        address[] memory deployedTokens = batchMintTokenFactory.deployTokens(
            tokenParams
        );

        // Assert
        assertEq(deployedTokens.length, 2);
        assertTrue(deployedTokens[0] != address(0));
        assertTrue(deployedTokens[1] == address(0));

        _assertValidTokenProps(
            deployedTokens[0],
            tokenName1,
            tokenSymbol1,
            totalSupply,
            address(this)
        );

        _assertTokenDeployedForUser(address(this), tokenName1, tokenSymbol1);
    }

    function test_DifferentUsersCanDeploySameTokens() public {
        // Arrange
        TokenParam[] memory tokenParams = new TokenParam[](2);
        tokenParams[0] = tokenParam1;
        tokenParams[1] = tokenParam2;

        address firstUser = address(0x123);
        address secondUser = address(0xabc);

        vm.prank(firstUser);

        // Act
        _expectTransfer(address(0xa), firstUser, totalSupply * (10 ** 18));
        _expectTokenDeployed(firstUser, address(0xa), tokenName1, tokenSymbol1);

        _expectTransfer(address(0xb), firstUser, totalSupply * (10 ** 18));
        _expectTokenDeployed(firstUser, address(0xb), tokenName2, tokenSymbol2);

        address[] memory deployedTokens1 = batchMintTokenFactory.deployTokens(
            tokenParams
        );

        vm.prank(secondUser);

        _expectTransfer(address(0xc), secondUser, totalSupply * (10 ** 18));
        _expectTokenDeployed(
            secondUser,
            address(0xc),
            tokenName1,
            tokenSymbol1
        );

        _expectTransfer(address(0xd), secondUser, totalSupply * (10 ** 18));
        _expectTokenDeployed(
            secondUser,
            address(0xd),
            tokenName2,
            tokenSymbol2
        );

        address[] memory deployedTokens2 = batchMintTokenFactory.deployTokens(
            tokenParams
        );

        // Assert
        assertEq(deployedTokens1.length, 2);
        assertEq(deployedTokens2.length, 2);

        _assertValidTokenProps(
            deployedTokens1[0],
            tokenName1,
            tokenSymbol1,
            totalSupply,
            firstUser
        );

        _assertValidTokenProps(
            deployedTokens1[1],
            tokenName2,
            tokenSymbol2,
            totalSupply,
            firstUser
        );

        _assertValidTokenProps(
            deployedTokens2[0],
            tokenName1,
            tokenSymbol1,
            totalSupply,
            secondUser
        );
        _assertValidTokenProps(
            deployedTokens2[1],
            tokenName2,
            tokenSymbol2,
            totalSupply,
            secondUser
        );

        _assertTokenDeployedForUser(firstUser, tokenName1, tokenSymbol1);
        _assertTokenDeployedForUser(firstUser, tokenName2, tokenSymbol2);

        _assertTokenDeployedForUser(secondUser, tokenName1, tokenSymbol1);
        _assertTokenDeployedForUser(secondUser, tokenName2, tokenSymbol2);
    }

    function _expectTransfer(
        address from_,
        address to_,
        uint256 amount_
    ) private {
        vm.expectEmit(false, true, false, true);
        emit IERC20.Transfer(from_, to_, amount_);
    }

    function _expectTokenDeployed(
        address creator_,
        address token_,
        string memory name_,
        string memory symbol_
    ) private {
        // indexed: creator, token
        // non-indexed: name, symbol
        vm.expectEmit(true, false, false, true, address(batchMintTokenFactory));
        emit BatchMintTokenFactory.TokenDeployed(
            creator_,
            token_,
            name_,
            symbol_
        );
    }

    function _expectTokenSkipped(
        address creator_,
        string memory name_,
        string memory symbol_,
        string memory reason_
    ) private {
        // indexed: creator
        vm.expectEmit(true, false, false, true, address(batchMintTokenFactory));
        emit BatchMintTokenFactory.TokenSkipped(
            creator_,
            name_,
            symbol_,
            reason_
        );
    }

    function _assertValidTokenProps(
        address tokenAddr_,
        string memory expectedName_,
        string memory expectedSymbol_,
        uint256 expectedTotalSupply_,
        address expectedCreator_
    ) private view {
        BatchMintToken token = BatchMintToken(tokenAddr_);

        uint256 supply = expectedTotalSupply_ * (10 ** token.decimals());

        assertEq(token.name(), expectedName_);
        assertEq(token.symbol(), expectedSymbol_);
        assertEq(token.totalSupply(), supply);
        assertEq(token.balanceOf(expectedCreator_), supply);
    }

    function _assertTokenDeployedForUser(
        address user_,
        string memory name_,
        string memory symbol_
    ) private view {
        bool deployed = batchMintTokenFactory.getUserToken(
            user_,
            name_,
            symbol_
        );
        assertTrue(deployed);
    }
}
