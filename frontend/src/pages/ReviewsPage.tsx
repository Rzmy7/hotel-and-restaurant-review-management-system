import React from "react";

interface ReviewsPageProps {
  toggleSidebar: () => void;
}

const reviews = [
  {
    id: 1,
    rating: 5,
    name: "Sarah Johnson",
    text: "Absolutely wonderful experience! The staff was incredibly friendly...",
    sentiment: "Positive",
    categories: ["Staff", "Cleanliness"],
    source: "Booking.com",
    date: "Nov 15, 2025",
    status: "Replied",
  },
  {
    id: 2,
    rating: 2,
    name: "Michael Chen",
    text: "Very disappointed with our stay. The room was not cleaned properly...",
    sentiment: "Negative",
    categories: ["Cleanliness", "Facilities"],
    source: "TripAdvisor",
    date: "Nov 14, 2025",
    status: "AI Draft",
  },
];

const sentimentColor = (s: string) =>
  s === "Positive"
    ? "bg-green-600 text-white"
    : s === "Negative"
    ? "bg-red-600 text-white"
    : "bg-gray-600 text-white";

const statusColor = (s: string) =>
  s === "Replied"
    ? "bg-green-600 text-white"
    : s === "AI Draft"
    ? "bg-purple-600 text-white"
    : "bg-gray-800 text-white";

const ReviewsPage: React.FC<ReviewsPageProps> = ({ toggleSidebar }) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <div className="flex items-center gap-3">
          {/* MOBILE MENU BUTTON */}
          <button
            onClick={toggleSidebar}
            className="px-3 py-2 border rounded-md text-sm"
          >
            ☰
          </button>

          <h1 className="text-2xl font-semibold">Reviews</h1>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 border rounded-md text-sm">
            Select date range
          </button>
          <button className="px-4 py-2 border rounded-md text-sm">
            Export
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search reviews..."
          className="w-full px-4 py-2 border rounded-md"
        />
        <button className="px-4 py-2 border rounded-md text-sm">
          Filters
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Rating</th>
              <th className="p-3">Review</th>
              <th className="p-3">Sentiment</th>
              <th className="p-3">Category</th>
              <th className="p-3">Source</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">⭐ {r.rating}</td>

                <td className="p-3">
                  <b>{r.name}</b>
                  <p className="text-gray-600">{r.text}</p>
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${sentimentColor(
                      r.sentiment
                    )}`}
                  >
                    {r.sentiment}
                  </span>
                </td>

                <td className="p-3 space-x-1">
                  {r.categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </td>

                <td className="p-3">
                  <span className="px-2 py-1 bg-black text-white rounded text-xs">
                    {r.source}
                  </span>
                </td>

                <td className="p-3">{r.date}</td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${statusColor(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewsPage;
