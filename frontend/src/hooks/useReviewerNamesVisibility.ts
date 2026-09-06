import { useQuery } from '@tanstack/react-query';
import { featureFlagService } from '../services/featureFlagService';

export function useReviewerNamesVisibility(): boolean {
    const { data } = useQuery({
        queryKey: ['featureFlag', 'show_reviewer_names'],
        queryFn: () => featureFlagService.isReviewerNamesVisible(),
        staleTime: 15 * 1000,
        refetchOnWindowFocus: true,
        initialData: true,
    });

    return data ?? true;
}
