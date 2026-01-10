

const CategoryPerformance = () => {
  const categories = [
    { name: 'Staff', score: 85, color: '#3b82f6' },
    { name: 'Cleanliness', score: 78, color: '#3b82f6' },
    { name: 'Location', score: 92, color: '#3b82f6' },
    { name: 'Food', score: 71, color: '#3b82f6' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="m-0 text-base font-bold text-gray-800">Category Performance</h3>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {categories.map((category) => (
          <div key={category.name} className="grid grid-cols-[100px_1fr_50px] items-center gap-3">
            <span className="text-sm font-medium text-gray-800">{category.name}</span>
            <div className="w-full">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: category.color,
                  }}
                ></div>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-500 text-right">{category.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPerformance;
