// SPDX-License-Identifier: UNLICENSED
// Deploy Contract using Hardhat or Remix IDE
pragma solidity ^0.8.0;
// 1 ether = 1000000000000000000 wei
// price is in wei

contract AIModelMarketplace {
    struct Model {
        string name;
        string description;
        uint256 price;
        address creator;
        uint256 ratingCount;
        uint256 ratingSum;
    }

    Model[] public models;
    mapping(uint256 => mapping(address => uint8)) public userRatings;
    mapping(address => uint256) public pendingWithdrawals;
    mapping(address => mapping(uint256 => bool)) public userModels;

    event ModelListed(uint256 indexed modelId, address indexed creator, string name, uint256 price);
    event ModelPurchased(uint256 indexed modelId, address indexed buyer);
    event ModelRated(uint256 indexed modelId, address indexed user, uint8 rating);
    event FundsWithdrawn(address indexed creator, uint256 amount);

    function listModel(string calldata name, string calldata description, uint256 price) external {
        require(price > 0, "Price must be greater than zero");

        models.push(Model({
            name: name,
            description: description,
            price: price,
            creator: msg.sender,
            ratingCount: 0,
            ratingSum: 0
        }));

        emit ModelListed(models.length - 1, msg.sender, name, price);
    }

    function purchaseModel(uint256 modelId) external payable {
        Model storage model = models[modelId];
        require(msg.value == model.price, "Incorrect price sent");
        require(!userModels[msg.sender][modelId], "Model already purchased");

        pendingWithdrawals[model.creator] += msg.value;
        userModels[msg.sender][modelId] = true;

        emit ModelPurchased(modelId, msg.sender);
    }

    function rateModel(uint256 modelId, uint8 rating) external {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(userModels[msg.sender][modelId], "User must own the model to rate it");

        Model storage model = models[modelId];
        if (userRatings[modelId][msg.sender] != 0) {
            model.ratingSum -= userRatings[modelId][msg.sender];
        } else {
            model.ratingCount++;
        }
        model.ratingSum += rating;
        userRatings[modelId][msg.sender] = rating;

        emit ModelRated(modelId, msg.sender, rating);
    }

    function withdrawFunds() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds available for withdrawal");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit FundsWithdrawn(msg.sender, amount);
    }

    function getModelDetails(uint256 modelId) external view returns (
        string memory name,
        string memory description,
        uint256 price,
        address creator,
        uint256 averageRating
    ) {
        require(modelId < models.length, "Model does not exist");
        Model storage model = models[modelId];
        uint256 avgRating = model.ratingCount == 0 ? 0 : model.ratingSum / model.ratingCount;

        return (
            model.name,
            model.description,
            model.price,
            model.creator,
            avgRating
        );
    }
}
