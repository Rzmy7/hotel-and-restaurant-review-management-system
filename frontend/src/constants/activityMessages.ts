export const ActivityMessages = {
    // Auth
    LOGIN: "Logging in...",
    SIGNUP: "Creating account...",
    VERIFY_OTP: "Verifying code...",
    RESET_PASSWORD: "Resetting password...",

    // Reviews
    GENERATE_REPLY: "Generating AI response...",
    SEND_REPLY: "Sending reply...",
    UPDATE_STATUS: "Updating review...",
    TRANSLATE: "Translating review...",
    BULK_GENERATE: "Generating responses in bulk...",

    // Sources
    ADD_SOURCE: "Adding review source...",
    UPDATE_SOURCE: "Updating review source...",
    DELETE_SOURCE: "Deleting review source...",
    VERIFY_SOURCE: "Verifying review source...",
    CLEAR_REVIEWS: "Clearing reviews...",

    // Competitors
    ADD_COMPETITOR: "Adding competitor...",
    UPDATE_COMPETITOR: "Updating competitor...",
    TRACK_COMPETITOR: "Tracking competitor...",
    UNTRACK_COMPETITOR: "Untracking competitor...",
    REFRESH_COMPETITOR: "Refreshing competitor data...",
    DELETE_COMPETITOR: "Deleting competitor...",

    // Organization & Settings
    SAVE_SETTINGS: "Saving settings...",
    UPLOAD_LOGO: "Uploading logo...",
    UPLOAD_RULES: "Uploading rules...",
    CREATE_GROUP: "Creating group...",
    UPDATE_GROUP: "Updating group...",
    DELETE_GROUP: "Deleting group...",
    INVITE_USER: "Inviting team member...",
    REMOVE_USER: "Removing team member...",
    LEAVE_ORG: "Leaving organization...",
    JOIN_GROUP: "Joining group...",
    ACCEPT_INVITE: "Accepting invite...",
    REJECT_INVITE: "Rejecting invite...",
    SWITCH_ORG: "Switching organization...",
    UPDATE_PROFILE: "Updating profile...",
    UPLOAD_IMAGE: "Uploading image...",
    CREATE_ORG: "Creating organization...",
    UPDATE_PLAN: "Updating subscription plan...",
    LOGOUT: "Logging out...",
    FORGOT_PASSWORD: "Sending reset link...",
    DISCARD_SETUP: "Discarding setup...",

    // Insights
    EXPORT_REPORT: "Exporting report...",

    // Admin
    CREATE_USER: "Creating user...",
    DISABLE_USER: "Disabling user...",
    REBUILD_EMBEDDINGS: "Rebuilding embeddings...",
    BROADCAST: "Sending announcement...",
    TRIGGER_PROCESSING: "Triggering processing..."
} as const;
