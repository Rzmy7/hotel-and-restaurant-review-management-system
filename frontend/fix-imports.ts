import * as fs from 'fs';
import * as path from 'path';

const componentsToMove: Record<string, string> = {
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

function walkDir(dir: string, callback: (path: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function fixImports(filePath: string) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const [component, folder] of Object.entries(componentsToMove)) {
        // 1. Pages/other components importing from '../components/Component' -> '../components/folder/Component'
        const regex1 = new RegExp(`from\\s+['\"]\\.\\./components/${component}['\"]`, 'g');
        if (regex1.test(content)) {
            content = content.replace(regex1, `from '../components/${folder}/${component}'`);
            changed = true;
        }

        // 2. Cross-domain import from '../../components/Component' -> '../../components/folder/Component'
        const regex1b = new RegExp(`from\\s+['\"]\\.\\./\\.\\./components/${component}['\"]`, 'g');
        if (regex1b.test(content)) {
            content = content.replace(regex1b, `from '../../components/${folder}/${component}'`);
            changed = true;
        }

        // 3. Imports from './components/Component' -> './components/folder/Component'
        const regex1c = new RegExp(`from\\s+['\"]\\./components/${component}['\"]`, 'g');
        if (regex1c.test(content)) {
            content = content.replace(regex1c, `from './components/${folder}/${component}'`);
            changed = true;
        }

        // 4. Same directory/components root imports: './Component' -> '../folder/Component' OR './folder/Component'
        const regex2 = new RegExp(`from\\s+['\"]\\.\\/${component}['\"]`, 'g');
        if (regex2.test(content)) {
            if (filePath.replace(/\\/g, '/').includes('/components/')) {
                // Likely moving between component folders or from components root to folder
                content = content.replace(regex2, (match) => {
                    // If already in a subfolder, it needs to step out and go to the correct folder '../folder/Component'
                    // If in components root, it needs to step into the folder './folder/Component'
                    // We'll let TS errors guide the tricky ones, but generally assuming we're fixing the ones left in components/ root OR ones moved that still point to './' instead of '../'
                    return `from '../${folder}/${component}'`;
                });
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${filePath}`);
    }
}

walkDir('./src', fixImports);
