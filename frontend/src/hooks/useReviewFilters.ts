import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterState, FetchReviewsParams } from '../types/reviews';

export function useReviewFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    const urlFilters = useMemo<FilterState & { page: number }>(() => {
        const getParam = (key: string) => searchParams.getAll(key);
        return {
            search: searchParams.get('q') || '',
            rating: getParam('rating').map(Number),
            sentiment: getParam('sentiment'),
            source: getParam('source'),
            category: getParam('category'),
            language: getParam('language'),
            status: getParam('status'),
            hasAiReply: searchParams.get('ai_reply') === 'true',
            page: Number(searchParams.get('page')) || 0,
        };
    }, [searchParams]);

    const [filters, setFilters] = useState<FilterState & { page: number }>(urlFilters);

    useEffect(() => {
        setFilters(urlFilters);
    }, [urlFilters]);

    const updateUrlParams = (newFilters: FilterState & { page: number }) => {
        const params = new URLSearchParams();
        if (newFilters.search) params.set('q', newFilters.search);
        newFilters.rating.forEach(v => params.append('rating', v.toString()));
        newFilters.sentiment.forEach(v => params.append('sentiment', v));
        newFilters.source.forEach(v => params.append('source', v));
        newFilters.category.forEach(v => params.append('category', v));
        newFilters.language.forEach(v => params.append('language', v));
        newFilters.status.forEach(v => params.append('status', v));
        if (newFilters.hasAiReply) params.set('ai_reply', 'true');
        if (newFilters.page > 0) params.set('page', newFilters.page.toString());
        setSearchParams(params);
    };

    const setSearchQuery = (query: string) => {
        const newFilters = { ...filters, search: query, page: 0 };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const toggleFilter = (type: keyof Omit<FilterState, 'search' | 'hasAiReply'>, value: string | number) => {
        const currentValues = filters[type] as (string | number)[];
        const exists = currentValues.includes(value);
        const newValues = exists
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        const newFilters = { ...filters, [type]: newValues, page: 0 };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const toggleAiReplyFilter = () => {
        const newFilters = { ...filters, hasAiReply: !filters.hasAiReply, page: 0 };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const setPage = (pageIndex: number) => {
        const newFilters = { ...filters, page: pageIndex };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    // Derived Fetch Params for the Service
    const fetchParams: FetchReviewsParams = useMemo(() => {
        return {
            ...filters,
            limit: 15,
            sortBy: 'date',
            sortOrder: 'desc'
        };
    }, [filters]);

    return {
        filters,
        fetchParams,
        setSearchQuery,
        toggleFilter,
        toggleAiReplyFilter,
        setPage
    };
}
