const ReviewsTableHeader = () => {
    return (
        <thead className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100/50 dark:border-slate-700/50">
            <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[120px]">Rating</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest min-w-[300px]">Review Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[140px]">Insights</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[140px]">Platform</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[140px]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[100px]">Action</th>
            </tr>
        </thead>
    );
};

export default ReviewsTableHeader;
