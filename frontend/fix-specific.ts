import * as fs from 'fs';

function replaceInFile(filePath: string, replacements: [RegExp, string][]) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        for (const [regex, replacement] of replacements) {
            if (regex.test(content)) {
                content = content.replace(regex, replacement);
                changed = true;
            }
        }
        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
    }
}

replaceInFile('src/components/dashboard/organisms/DashboardHeader.tsx', [
    [/from\s+['"]\.\.\/\.\.\/NotificationPanel['"]/g, "from '../../shared/NotificationPanel'"],
    [/from\s+['"]\.\.\/\.\.\/ProfileDropdown['"]/g, "from '../../shared/ProfileDropdown'"],
    [/from\s+['"]\.\.\/\.\.\/OrganizationSwitcher['"]/g, "from '../../shared/OrganizationSwitcher'"]
]);

replaceInFile('src/components/reviews/ReviewDetailModal.tsx', [
    [/from\s+['"]\.\/reviews\/ReviewDetailLightbox['"]/g, "from './ReviewDetailLightbox'"],
    [/from\s+['"]\.\/ui\/Modal['"]/g, "from '../ui/Modal'"],
    [/from\s+['"]\.\/ui\/Button['"]/g, "from '../ui/Button'"]
]);

replaceInFile('src/components/reviews/ReviewsTable.tsx', [
    [/from\s+['"]\.\/reviews\/ReviewsTableHeader['"]/g, "from './ReviewsTableHeader'"],
    [/from\s+['"]\.\/reviews\/ReviewsTableRow['"]/g, "from './ReviewsTableRow'"],
    [/from\s+['"]\.\/reviews\/ReviewsTablePagination['"]/g, "from './ReviewsTablePagination'"]
]);

replaceInFile('src/components/shared/PersonalInfoForm.tsx', [
    [/from\s+['"]\.\.\/pages\/ProfilePage['"]/g, "from '../../pages/ProfilePage'"]
]);

replaceInFile('src/components/shared/ProfileSidebar.tsx', [
    [/from\s+['"]\.\.\/pages\/ProfilePage['"]/g, "from '../../pages/ProfilePage'"]
]);

replaceInFile('src/components/sources/SourceComparison.tsx', [
    [/from\s+['"]\.\.\/\.\.\/\.\.\/types\/dashboard['"]/g, "from '../../types/dashboard'"],
    [/from\s+['"]\.\.\/atoms\/Card['"]/g, "from '../ui/atoms/Card'"]
]);

replaceInFile('src/pages/CompetitorsPage.tsx', [
    [/from\s+['"]\.\.\/components\/shared\/AddCompetitorModal['"]/g, "from '../components/competitors/AddCompetitorModal'"]
]);

replaceInFile('src/pages/ReviewSourcesPage.tsx', [
    [/from\s+['"]\.\.\/components\/shared\/AddSourceModal['"]/g, "from '../components/sources/AddSourceModal'"],
    [/from\s+['"]\.\.\/components\/shared\/EditSourceModal['"]/g, "from '../components/sources/EditSourceModal'"]
]);
