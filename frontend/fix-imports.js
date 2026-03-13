const fs = require('fs');
const path = require('path');

const componentsToMove = {
    'ReviewDetailModal': 'reviews',
    'ReviewDistributionModal': 'reviews',
    'ReviewImageGallery': 'reviews',
    'ReviewRatingDistribution': 'reviews',
    'ReviewStats': 'reviews',
    'ReviewsTable': 'reviews',
    'ReviewsToolbar': 'reviews',
    'SourceBreakdown': 'sources',
    'SourceComparison': 'sources',
    'SourceStats': 'sources',
    'SourcesTable': 'sources',
    'CompetitorComparison': 'competitors',
    'CompetitorRankingsPage': 'competitors',
    'CompetitorsPage': 'competitors',
};

const allSharedComponents = [
    'AIInsights', 'AddCompetitorModal', 'AddSourceModal', 'AlertsPanel', 'CategoryPerformance',
    'DashboardHeader', 'DashboardSkeleton', 'DateRangeModal', 'EditSourceModal', 'InsightsHeader',
    'LatestReviews', 'MetricCard', 'NotificationPanel', 'NotificationsHeader', 'OrganizationSwitcher',
    'PersonalInfoForm', 'ProfileDropdown', 'ProfileForm', 'ProfileHeader', 'ProfileSidebar',
    'ReviewSources', 'ScrapeLauncher', 'SentimentChart', 'SettingsHeader', 'SetupLayout',
    'SideBar', 'Skeleton', 'SyncHistoryPanel', 'Toast', 'TrendsChart'
];

allSharedComponents.forEach(comp => componentsToMove[comp] = 'shared');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function fixImports(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const [component, folder] of Object.entries(componentsToMove)) {
        // Replace direct relative imports in pages/ like from '../components/Component'
        const regex1 = new RegExp(`from\\s+['\"]\\.\\./components/${component}['\"]`, 'g');
        if (regex1.test(content)) {
            content = content.replace(regex1, `from '../components/${folder}/${component}'`);
            changed = true;
        }

        // Replace relative imports in components/ like from './Component' -> from '../folder/Component'
        const regex2 = new RegExp(`from\\s+['\"]\\.\\/${component}['\"]`, 'g');
        if (regex2.test(content)) {
            // Very naive approach: assume we are moving everything out to subfolders
            // So if it imported from same depth, now its relative depth changed
            // Instead of complex relative depth, just replace './Component' with '../folder/Component'
            content = content.replace(regex2, `from '../${folder}/${component}'`);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${filePath}`);
    }
}

walkDir('./src', fixImports);
