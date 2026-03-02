const ReviewsTableHeader = () => {
    return (
        <thead className="bg-gray-50/50 border-b border-gray-100/50">
            <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[120px]">Rating</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[300px]">Review Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Insights</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Status</th>
            </tr>
        </thead>
    );
};

export default ReviewsTableHeader;
