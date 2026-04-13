export const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'roles',
        component: () => import('@/pages/roles.vue'),
        meta: { requiresAuth: true, permission: 'role:read' },
      },
      {
        path: 'role-permissions',
        component: () => import('@/pages/role-permissions.vue'),
        meta: { requiresAuth: true, permission: 'role:update' },
      },
      {
        path: 'users',
        component: () => import('@/pages/users.vue'),
        meta: { requiresAuth: true, permission: 'user:read' },
      },
      {
        path: 'drivers',
        component: () => import('@/pages/drivers.vue'),
        meta: { requiresAuth: true, permission: 'driver:read' },
      },
      {
        path: 'vehicles',
        component: () => import('@/pages/vehicles.vue'),
        meta: { requiresAuth: true, permission: 'vehicle:read' },
      },
      {
        path: 'clients',
        component: () => import('@/pages/clients.vue'),
        meta: { requiresAuth: true, permission: 'client:read' },
      },
      {
        path: 'facilities',
        component: () => import('@/pages/facilities.vue'),
        meta: { requiresAuth: true, permission: 'facility:read' },
      },
      {
        path: 'routes',
        component: () => import('@/pages/routes.vue'),
        meta: { requiresAuth: true, permission: 'route:read' },
      },
      {
        path: 'contracts',
        component: () => import('@/pages/contracts.vue'),
        meta: { requiresAuth: true, permission: 'contract:read' },
      },
      {
        path: 'orders',
        component: () => import('@/pages/orders.vue'),
        meta: { requiresAuth: true, permission: 'order:read' },
      },
      {
        path: 'order-recap',
        component: () => import('@/pages/order-recap.vue'),
        meta: { requiresAuth: true, permission: 'order-recap:read' },
      },
      {
        path: 'contract-recap',
        component: () => import('@/pages/contract-recap.vue'),
        meta: { requiresAuth: true, permission: 'client-recap:read' },
      },
      {
        path: 'trip-sheets',
        component: () => import('@/pages/trip-sheets.vue'),
        meta: { requiresAuth: true, permission: 'trip_sheet:read' },
      },
      {
        path: 'shuttles',
        component: () => import('@/pages/shuttles.vue'),
        meta: { requiresAuth: true, permission: 'shuttle:read' },
      },
      {
        path: 'vehicle-services',
        component: () => import('@/pages/vehicle-services.vue'),
        meta: { requiresAuth: true, permission: 'vehicle-service:read' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/blank.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/pages/login.vue'),
        meta: { guestOnly: true },
      },
      {
        path: 'trip-sheets/:orderNumber/:uuid',
        component: () => import('@/pages/trip-sheet.vue'),
      },
      {
        path: 'trip-sheets/:uuid',
        component: () => import('@/pages/trip-sheet.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
]



