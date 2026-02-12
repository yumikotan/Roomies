# Security Guide - API Key Protection

## ⚠️ Important: Your API Keys Were Exposed

Your Firebase API keys were previously committed to the public GitHub repository. Follow these steps to secure your application:

## Immediate Actions Required

### 1. Rotate Your Firebase API Keys
Since your API keys are now public, you should rotate them in the Firebase Console:
- Go to [Firebase Console](https://console.firebase.google.com/)
- Navigate to Project Settings → General
- Regenerate your API keys
- Update the secret config files with the new keys

### 2. Remove Keys from Git History
The keys are still in your git history. To remove them:

```bash
# Option 1: Use git-filter-repo (recommended)
git filter-repo --path frontend/firebaseConfig.js --path RoomiesBackend/firebaseConfig.js --path frontend/firebaseClient.js --path frontend/cleanupDuplicates.html --invert-paths

# Option 2: Use BFG Repo-Cleaner
# Download from https://rtyley.github.io/bfg-repo-cleaner/
bfg --replace-text passwords.txt

# After cleaning, force push (WARNING: This rewrites history)
git push origin --force --all
```

**⚠️ Warning**: Force pushing rewrites git history. Coordinate with your team if working collaboratively.

### 3. Set Up Environment Variables

#### Backend (RoomiesBackend)
1. Create a `.env` file in `RoomiesBackend/` directory:
```bash
cd RoomiesBackend
cp .env.example .env  # If .env.example exists, or create manually
```

2. Add your Firebase credentials to `.env`:
```
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_auth_domain_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
FIREBASE_APP_ID=your_app_id_here
FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

3. Install dotenv (if not already installed):
```bash
cd RoomiesBackend
npm install dotenv
```

#### Frontend
1. Create `frontend/firebaseConfig.secret.js`:
```javascript
export default {
  apiKey: "your_api_key_here",
  authDomain: "your_auth_domain_here",
  projectId: "your_project_id_here",
  storageBucket: "your_storage_bucket_here",
  messagingSenderId: "your_messaging_sender_id_here",
  appId: "your_app_id_here",
  measurementId: "your_measurement_id_here"
};
```

2. Create `frontend/cleanupDuplicates.secret.js` (if using cleanupDuplicates.html):
```javascript
export default {
  apiKey: "your_api_key_here",
  authDomain: "your_auth_domain_here",
  projectId: "your_project_id_here",
  storageBucket: "your_storage_bucket_here",
  messagingSenderId: "your_messaging_sender_id_here",
  appId: "your_app_id_here",
  measurementId: "your_measurement_id_here"
};
```

## Files That Are Now Gitignored

The following files are now excluded from git:
- `.env` files (all locations)
- `*.secret.js` files
- `serviceAccountKey.json` files

## Verify Your Setup

1. Check that secret files are not tracked:
```bash
git status
# Should NOT show .env or *.secret.js files
```

2. Test your application to ensure it still works with the new configuration.

## Additional Security Recommendations

1. **Firebase Security Rules**: Ensure your Firestore security rules are properly configured to prevent unauthorized access.

2. **API Key Restrictions**: In Firebase Console, restrict your API keys:
   - Go to Google Cloud Console
   - Navigate to APIs & Services → Credentials
   - Edit your API key
   - Add HTTP referrer restrictions for web keys
   - Add application restrictions for mobile keys

3. **Monitor Usage**: Regularly check Firebase usage logs for suspicious activity.

4. **Never Commit Secrets**: Always use `.gitignore` for sensitive files and environment variables.

## Need Help?

If you're unsure about any step, consult:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub's Guide on Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
