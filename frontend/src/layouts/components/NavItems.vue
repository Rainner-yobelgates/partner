<script lang="ts" setup>
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import { useAuthStore } from '@/stores/auth'

type NavChild = {
  permission: string
  item: { title: string; icon: string; to: string }
}

type NavGroupDef = {
  title: string
  icon: string
  children: NavChild[]
}

const authStore = useAuthStore()

/** Grup dropdown: hanya dirender jika minimal satu item punya permission. */
const navGroups: NavGroupDef[] = [
  {
    title: 'Master data',
    icon: 'ri-database-2-line',
    children: [
      { permission: 'driver:read', item: { title: 'Pengemudi', icon: 'ri-steering-2-line', to: '/drivers' } },
      { permission: 'vehicle:read', item: { title: 'Kendaraan', icon: 'ri-bus-line', to: '/vehicles' } },
      { permission: 'facility:read', item: { title: 'Fasilitas', icon: 'ri-building-line', to: '/facilities' } },
      { permission: 'route:read', item: { title: 'Rute', icon: 'ri-road-map-line', to: '/routes' } },
      { permission: 'vehicle-service:read', item: { title: 'Pemeliharaan Kendaraan', icon: 'ri-tools-line', to: '/vehicle-services' } },
    ],
  },
  {
    title: 'Klien',
    icon: 'ri-briefcase-line',
    children: [
      { permission: 'client:read', item: { title: 'Client', icon: 'ri-community-line', to: '/clients' } },
      { permission: 'contract:read', item: { title: 'Kontrak', icon: 'ri-file-list-3-line', to: '/contracts' } },
      { permission: 'shuttle:read', item: { title: 'Antar Jemput', icon: 'ri-bus-2-line', to: '/shuttles' } },
    ],
  },
  {
    title: 'Rekapitulasi',
    icon: 'ri-pie-chart-2-line',
    children: [
      { permission: 'order-recap:read', item: { title: 'Rekap Pesanan', icon: 'ri-calculator-line', to: '/order-recap' } },
      { permission: 'client-recap:read', item: { title: 'Rekap Klien', icon: 'ri-scales-3-line', to: '/contract-recap' } },
    ],
  },
  {
    title: 'Pesanan',
    icon: 'ri-shopping-cart-line',
    children: [
      { permission: 'order:read', item: { title: 'Pesanan', icon: 'ri-file-add-line', to: '/orders' } },
      { permission: 'trip_sheet:read', item: { title: 'Trip Sheet', icon: 'ri-clipboard-line', to: '/trip-sheets' } },
    ],
  },
  {
    title: 'Pengaturan',
    icon: 'ri-admin-line',
    children: [
      { permission: 'user:read', item: { title: 'Pengguna', icon: 'ri-user-3-line', to: '/users' } },
      { permission: 'role:read', item: { title: 'Peran', icon: 'ri-shield-user-line', to: '/roles' } },
      { permission: 'role:update', item: { title: 'Hak Akses Peran', icon: 'ri-shield-keyhole-line', to: '/role-permissions' } },
    ],
  },
]

const visibleGroups = computed(() =>
  navGroups
    .map(group => ({
      title: group.title,
      icon: group.icon,
      children: group.children.filter(c => authStore.hasPermission(c.permission)),
    }))
    .filter(group => group.children.length > 0),
)
</script>

<template>
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'ri-home-smile-line',
      to: '/dashboard',
    }"
  />
  <VerticalNavGroup
    v-for="group in visibleGroups"
    :key="group.title"
    :item="{ title: group.title, icon: group.icon }"
  >
    <VerticalNavLink
      v-for="child in group.children"
      :key="child.item.to"
      :item="child.item"
    />
  </VerticalNavGroup>
</template>

