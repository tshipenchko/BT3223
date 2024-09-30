// noinspection JSUnresolvedReference
const ethereum = window.ethereum;
if (typeof ethereum === "undefined") {
    alert("Please install MetaMask.");
    throw new Error("MetaMask not found.");
}

import { abi, address, getHardhatAddress } from "./contract.js";
import { Web3 } from "https://esm.sh/web3";

const web3 = new Web3(ethereum);
let currentAddress = parseInt(ethereum.chainId, 16) === 31337 ? getHardhatAddress() : address;
const AIModelMarketplace = new web3.eth.Contract(abi, currentAddress);

const modelsElement = document.getElementById("models");
const userInfoElement = document.getElementById("user-info");
const createdModelsElement = document.getElementById("created-models");
const listModelFormElement = document.getElementById("list-model-form");
const ownedModelsElement = document.getElementById("owned-models");

const wei2eth = wei => web3.utils.fromWei(wei, "ether");
const eth2wei = eth => web3.utils.toWei(eth, "ether");
let models = [];
let account;

async function fetchModelDetails(id) {
    const model = await AIModelMarketplace.methods.getModelDetails(id).call();
    return {
        name: model.name,
        description: model.description,
        price: model.price,
        creator: model.creator,
        rating: model.averageRating,
    };
}

async function fetchModels() {
    let id = 0;
    models = [];
    modelsElement.innerHTML = "";
    while (true) {
        try {
            const model = await fetchModelDetails(id);
            models.push(model);
            displayModel(id, model);
            id++;
        } catch (e) {
            break;
        }
    }
    if (id === 0) {
        modelsElement.innerHTML = "<p>No models available.</p>";
    }
    return models;
}

function displayModel(id, model) {
    modelsElement.innerHTML += `
        <li class="model">
            <h2>${model.name}</h2>
            <p>${model.description}</p>
            <p>Creator: ${model.creator}</p>
            <p>Price: ${wei2eth(model.price)} ETH</p>
            <p>Rating: ${model.rating}</p>
            <button onclick="purchaseModel(${id})">Purchase</button>
        </li>
    `;
}

async function fetchUserInfo() {
    let text = `
        <p>Account: ${account}</p>
        <p>Balance: ${wei2eth(await web3.eth.getBalance(account))} ETH</p>
    `;

    const availableWithdrawal = await AIModelMarketplace.methods.pendingWithdrawals(account).call();
    text += `
        <p>Available withdrawal: ${wei2eth(availableWithdrawal)} ETH</p>
    `;
    if (availableWithdrawal > 0) {
        text += `
            <button onclick="withdrawFunds()">Withdraw ${wei2eth(availableWithdrawal)} ETH</button>
        `;
    }
    userInfoElement.innerHTML = text;
}

function displayCreatedModels(models) {
    createdModelsElement.innerHTML = "";
    models.filter(model => model.creator.toLowerCase() === account).forEach(model => {
        createdModelsElement.innerHTML += `
            <li class="model">
                <h2>${model.name}</h2>
                <p>${model.description}</p>
                <p>Price: ${wei2eth(model.price)} ETH</p>
                <p>Rating: ${model.rating}</p>
            </li>
        `;
    });
}

function displayOwnedModels(models) {
    ownedModelsElement.innerHTML = "";
    models.forEach((model, id) => {
        if (model.creator.toLowerCase() !== account) return;

        ownedModelsElement.innerHTML += `
            <li class="model">
                <h2>${model.name}</h2>
                <p>${model.description}</p>
                <p>Creator: ${model.creator}</p>
                <p>Price: ${wei2eth(model.price)} ETH</p>
                <p>Rating: ${model.rating}</p>
                <label for="rating-${id}">Rate this model: </label>
                <select id="rating-${id}">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
                <button onclick="rateModel(${id})">Rate</button>
            </li>
        `;
    });
}

window.purchaseModel = async id => {
    const model = models[id];
    await AIModelMarketplace.methods.purchaseModel(id).send({ from: account, value: model.price });
    alert("Model bought successfully.");
    await refreshModelList().then();
};

window.rateModel = async id => {
    const rating = document.getElementById(`rating-${id}`).value;
    if (rating < 1 || rating > 5) {
        alert("Rating must be between 1 and 5.");
        return;
    }
    await AIModelMarketplace.methods.rateModel(id, rating).send({ from: account });
    alert("Model rated successfully.");
    await refreshModelList().then();
};

window.withdrawFunds = async () => {
    await AIModelMarketplace.methods.withdrawFunds().send({ from: account });
    alert("Withdrawal successful.");
    await refreshModelList().then();
};

async function refreshModelList() {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0].toLowerCase();

    const models = await fetchModels();
    await fetchUserInfo().then();
    displayCreatedModels(models);
    displayOwnedModels(models);
}

function setupModelListingForm() {
    listModelFormElement.onsubmit = (event) => {
        event.preventDefault();
        const form = event.target;
        const name = form.name.value;
        const description = form.description.value;
        const price = eth2wei(form.price.value);

        AIModelMarketplace.methods.listModel(name, description, price).send({ from: account }).on("receipt", _ => {
            alert("Model listed successfully.");
            refreshModelList().then();
        }).on("error", error => {
            console.error(error);
            alert("Error listing model.");
        });
    };
}

async function main() {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0].toLowerCase();

    AIModelMarketplace.events.ModelListed().on("data", async (event) => {
        console.log("Model listed event:", event);
        await refreshModelList();
    });

    AIModelMarketplace.events.ModelRated().on("data", async (event) => {
        console.log("Model rated event:", event);
        await refreshModelList();
    });

    AIModelMarketplace.events.ModelPurchased().on("data", async (event) => {
        console.log("Model purchased event:", event);
        await refreshModelList();
    });

    AIModelMarketplace.events.FundsWithdrawn().on("data", async (event) => {
        console.log("Funds withdrawn event:", event);
        await refreshModelList();
    });

    setupModelListingForm();
    await refreshModelList().then();
}

main().then();

console.log(AIModelMarketplace.events);
console.log(AIModelMarketplace.events.ModelListed());
