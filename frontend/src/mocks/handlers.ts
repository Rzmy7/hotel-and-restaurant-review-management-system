import { http, HttpResponse } from 'msw';

export const handlers = [
  // Maintenance Status
  http.get('*/maintenance/status', () => {
    return HttpResponse.json({ is_maintenance: false });
  }),

  // Organizations
  http.get('*/user/organizations', () => {
    return HttpResponse.json([
      { 
        organization_id: 'org-1', 
        organization_name: 'Mock Hotel', 
        status: 'Active',
        website_url: 'https://mock.com',
        organization_type: 'Hotel'
      },
    ]);
  }),

  http.get('*/organization-types', () => {
    return HttpResponse.json([
      { type_code: 1, type_name: 'Hotel' }
    ]);
  }),

  // User Profile
  http.get('*/users/me', () => {
    return HttpResponse.json({
      is_2fa_enabled: true,
      email: 'user@mock.com'
    });
  }),

  // Update Organization (Settings)
  http.patch('*/organizations/:orgId', async ({ request }) => {
    const updates = await request.json();
    return HttpResponse.json({
      success: true,
      ...updates
    });
  }),

  // Reviews
  http.get('*/source/reviews', () => {
    return HttpResponse.json({
      data: [{ id: '1', rating: 5, comment: 'Mock Review' }],
      total: 1,
      page: 0,
      limit: 15,
      totalPages: 1,
    });
  }),
];
