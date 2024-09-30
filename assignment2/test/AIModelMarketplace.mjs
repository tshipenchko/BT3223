import { expect } from "chai";

describe("AIModelMarketplace", function () {
    let marketplace;
    let owner, user1;

    it("should deploy the contract and list a model", async function () {
        // Deploy the contract
        const AIModelMarketplace = await ethers.getContractFactory("AIModelMarketplace");
        marketplace = await AIModelMarketplace.deploy();
        [owner, user1] = await ethers.getSigners();

        // List a model
        await marketplace.connect(owner).listModel("Model 1", "Description 1", 1000000000000000000n); // 1 ether in wei

        // Get model details and check
        const modelDetails = await marketplace.getModelDetails(0);
        expect(modelDetails.name).to.equal("Model 1");
        expect(modelDetails.description).to.equal("Description 1");
        expect(modelDetails.price).to.equal(1000000000000000000n); // 1 ether in wei
        expect(modelDetails.creator).to.equal(owner.address);
    });

    it("should allow a user to purchase a model", async function () {
        // Deploy the contract
        const AIModelMarketplace = await ethers.getContractFactory("AIModelMarketplace");
        marketplace = await AIModelMarketplace.deploy();
        [owner, user1] = await ethers.getSigners();

        // List a model
        await marketplace.connect(owner).listModel("Model 1", "Description 1", 1000000000000000000n); // 1 ether in wei

        // Purchase the model
        await marketplace.connect(user1).purchaseModel(0, { value: 1000000000000000000n }); // 1 ether in wei

        // Check if the user has purchased the model
        expect(await marketplace.userModels(user1.address, 0)).to.be.true;

        // Verify pending withdrawals for the owner
        expect(await marketplace.pendingWithdrawals(owner.address)).to.equal(1000000000000000000n); // 1 ether in wei
    });

    it("should allow a user to rate a model", async function () {
        // Deploy the contract
        const AIModelMarketplace = await ethers.getContractFactory("AIModelMarketplace");
        marketplace = await AIModelMarketplace.deploy();
        [owner, user1] = await ethers.getSigners();

        // List and purchase a model
        await marketplace.connect(owner).listModel("Model 1", "Description 1", 1000000000000000000n); // 1 ether in wei
        await marketplace.connect(user1).purchaseModel(0, { value: 1000000000000000000n }); // 1 ether in wei

        // Rate the model
        await marketplace.connect(user1).rateModel(0, 4);

        // Check the rating details
        const modelDetails = await marketplace.models(0);
        expect(modelDetails.ratingCount).to.equal(1n);
        expect(modelDetails.ratingSum).to.equal(4n);
    });
});
