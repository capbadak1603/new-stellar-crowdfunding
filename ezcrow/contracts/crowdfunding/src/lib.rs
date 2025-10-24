#![no_std]
use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, Env, Map, String, Symbol, Vec,
};

// Storage keys for our contract data
const CAMPAIGN_GOAL: Symbol = symbol_short!("goal");
const CAMPAIGN_DEADLINE: Symbol = symbol_short!("deadline");
const TOTAL_RAISED: Symbol = symbol_short!("raised");
const DONATIONS: Symbol = symbol_short!("donations");
const CAMPAIGN_OWNER: Symbol = symbol_short!("owner");
const XLM_TOKEN_ADDRESS: Symbol = symbol_short!("xlm_addr");
const IS_ALREADY_INIT: Symbol = symbol_short!("is_init");

// New feature storage keys
const CAMPAIGN_CATEGORY: Symbol = symbol_short!("category");
const CAMPAIGN_UPDATES: Symbol = symbol_short!("updates");
const CAMPAIGN_COMMENTS: Symbol = symbol_short!("comments");
const MILESTONES: Symbol = symbol_short!("mileston");
const UPDATE_COUNTER: Symbol = symbol_short!("up_count");
const COMMENT_COUNTER: Symbol = symbol_short!("cm_count");

// Main contract struct
#[contract]
pub struct CrowdfundingContract;

// Contract implementation
#[contractimpl]
impl CrowdfundingContract {
    // Initialize the crowdfunding campaign with enhanced features
    pub fn initialize(
        env: Env,
        owner: Address,     // Campaign creator's address
        goal: i128,         // Target amount (in stroops: 1 XLM = 10,000,000 stroops)
        deadline: u64,      // Unix timestamp when campaign ends
        xlm_token: Address, // XLM token contract address
        category: String,   // Campaign category (e.g., "Technology", "Art", "Social")
    ) {
        // Verify the owner is who they claim to be
        owner.require_auth();

        // Store campaign settings
        env.storage().instance().set(&CAMPAIGN_OWNER, &owner);
        env.storage().instance().set(&CAMPAIGN_GOAL, &goal);
        env.storage().instance().set(&CAMPAIGN_DEADLINE, &deadline);
        env.storage().instance().set(&TOTAL_RAISED, &0i128);
        env.storage().instance().set(&XLM_TOKEN_ADDRESS, &xlm_token);
        env.storage().instance().set(&CAMPAIGN_CATEGORY, &category);

        // Set initialization flag to true
        env.storage().instance().set(&IS_ALREADY_INIT, &true);

        // Initialize empty collections
        let donations: Map<Address, i128> = Map::new(&env);
        env.storage().instance().set(&DONATIONS, &donations);

        let updates: Vec<String> = Vec::new(&env);
        env.storage().instance().set(&CAMPAIGN_UPDATES, &updates);

        let comments: Vec<String> = Vec::new(&env);
        env.storage().instance().set(&CAMPAIGN_COMMENTS, &comments);

        let milestones: Vec<String> = Vec::new(&env);
        env.storage().instance().set(&MILESTONES, &milestones);

        // Initialize counters
        env.storage().instance().set(&UPDATE_COUNTER, &0u32);
        env.storage().instance().set(&COMMENT_COUNTER, &0u32);
    }

    // Make a donation to the campaign
    pub fn donate(env: Env, donor: Address, amount: i128) {
        // Verify the donor is authorized
        donor.require_auth();

        // Check if campaign is still active
        let deadline: u64 = env.storage().instance().get(&CAMPAIGN_DEADLINE).unwrap();
        if env.ledger().timestamp() > deadline {
            panic!("Campaign has ended");
        }

        // Validate donation amount
        if amount <= 0 {
            panic!("Donation amount must be positive");
        }

        // Get the XLM token address from storage and contract address
        let xlm_token_address: Address = env.storage().instance().get(&XLM_TOKEN_ADDRESS).unwrap();
        let xlm_token = token::Client::new(&env, &xlm_token_address);
        let contract_address = env.current_contract_address();

        // Transfer XLM from donor to this contract
        xlm_token.transfer(&donor, &contract_address, &amount);

        // Update total raised
        let mut total: i128 = env.storage().instance().get(&TOTAL_RAISED).unwrap();
        total += amount;
        env.storage().instance().set(&TOTAL_RAISED, &total);

        // Track individual donor's contribution
        let mut donations: Map<Address, i128> = env.storage().instance().get(&DONATIONS).unwrap();
        let current_donation = donations.get(donor.clone()).unwrap_or(0);
        donations.set(donor, current_donation + amount);
        env.storage().instance().set(&DONATIONS, &donations);
    }

    // Get the total amount raised so far
    pub fn get_total_raised(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_RAISED).unwrap_or(0)
    }

    // Get how much a specific donor has contributed
    pub fn get_donation(env: Env, donor: Address) -> i128 {
        let donations: Map<Address, i128> = env.storage().instance().get(&DONATIONS).unwrap();
        donations.get(donor).unwrap_or(0)
    }

    // Get initialization status - for frontend to check if contract is initialized
    pub fn get_is_already_init(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&IS_ALREADY_INIT)
            .unwrap_or(false)
    }

    // ===== NEW FEATURES =====

    // Get campaign category
    pub fn get_category(env: Env) -> String {
        env.storage()
            .instance()
            .get(&CAMPAIGN_CATEGORY)
            .unwrap_or(String::from_str(&env, "Uncategorized"))
    }

    // Post an update (only campaign owner)
    pub fn post_update(env: Env, owner: Address, update_text: String) {
        owner.require_auth();

        // Verify caller is the campaign owner
        let campaign_owner: Address = env.storage().instance().get(&CAMPAIGN_OWNER).unwrap();
        if owner != campaign_owner {
            panic!("Only campaign owner can post updates");
        }

        // Get current updates and add new one
        let mut updates: Vec<String> = env.storage().instance().get(&CAMPAIGN_UPDATES).unwrap();
        updates.push_back(update_text);
        env.storage().instance().set(&CAMPAIGN_UPDATES, &updates);

        // Increment update counter
        let mut counter: u32 = env.storage().instance().get(&UPDATE_COUNTER).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&UPDATE_COUNTER, &counter);
    }

    // Get all campaign updates
    pub fn get_updates(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&CAMPAIGN_UPDATES)
            .unwrap_or(Vec::new(&env))
    }

    // Get number of updates
    pub fn get_update_count(env: Env) -> u32 {
        env.storage().instance().get(&UPDATE_COUNTER).unwrap_or(0)
    }

    // Add a comment (any address can comment)
    pub fn add_comment(env: Env, commenter: Address, comment_text: String) {
        commenter.require_auth();

        // Get current comments and add new one
        let mut comments: Vec<String> = env.storage().instance().get(&CAMPAIGN_COMMENTS).unwrap();
        comments.push_back(comment_text);
        env.storage().instance().set(&CAMPAIGN_COMMENTS, &comments);

        // Increment comment counter
        let mut counter: u32 = env.storage().instance().get(&COMMENT_COUNTER).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&COMMENT_COUNTER, &counter);
    }

    // Get all comments
    pub fn get_comments(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&CAMPAIGN_COMMENTS)
            .unwrap_or(Vec::new(&env))
    }

    // Get number of comments
    pub fn get_comment_count(env: Env) -> u32 {
        env.storage().instance().get(&COMMENT_COUNTER).unwrap_or(0)
    }

    // Add a milestone (only campaign owner)
    pub fn add_milestone(env: Env, owner: Address, milestone_text: String) {
        owner.require_auth();

        // Verify caller is the campaign owner
        let campaign_owner: Address = env.storage().instance().get(&CAMPAIGN_OWNER).unwrap();
        if owner != campaign_owner {
            panic!("Only campaign owner can add milestones");
        }

        // Get current milestones and add new one
        let mut milestones: Vec<String> = env.storage().instance().get(&MILESTONES).unwrap();
        milestones.push_back(milestone_text);
        env.storage().instance().set(&MILESTONES, &milestones);
    }

    // Get all milestones
    pub fn get_milestones(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&MILESTONES)
            .unwrap_or(Vec::new(&env))
    }

    // Get campaign progress percentage
    pub fn get_progress_percentage(env: Env) -> u32 {
        let total_raised: i128 = env.storage().instance().get(&TOTAL_RAISED).unwrap_or(0);
        let goal: i128 = env.storage().instance().get(&CAMPAIGN_GOAL).unwrap_or(1);

        if goal == 0 {
            return 0;
        }

        let percentage = (total_raised * 100) / goal;
        if percentage > 100 {
            100
        } else {
            percentage as u32
        }
    }

    // Check if campaign is active
    pub fn is_campaign_active(env: Env) -> bool {
        let deadline: u64 = env
            .storage()
            .instance()
            .get(&CAMPAIGN_DEADLINE)
            .unwrap_or(0);
        env.ledger().timestamp() <= deadline
    }

    // Get campaign stats summary
    pub fn get_campaign_stats(env: Env) -> Map<String, i128> {
        let mut stats = Map::new(&env);

        let total_raised: i128 = env.storage().instance().get(&TOTAL_RAISED).unwrap_or(0);
        let goal: i128 = env.storage().instance().get(&CAMPAIGN_GOAL).unwrap_or(0);
        let donations: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONATIONS)
            .unwrap_or(Map::new(&env));

        stats.set(String::from_str(&env, "raised"), total_raised);
        stats.set(String::from_str(&env, "goal"), goal);
        stats.set(String::from_str(&env, "donors"), donations.len() as i128);
        stats.set(
            String::from_str(&env, "updates"),
            env.storage().instance().get(&UPDATE_COUNTER).unwrap_or(0) as i128,
        );
        stats.set(
            String::from_str(&env, "comments"),
            env.storage().instance().get(&COMMENT_COUNTER).unwrap_or(0) as i128,
        );

        stats
    }
}

#[cfg(test)]
mod test;
