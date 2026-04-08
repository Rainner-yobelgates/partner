<script lang="ts" setup>
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'ri-home-smile-line',
      to: '/dashboard',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('driver:read')"
    :item="{
      title: 'Pengemudi',
      icon: 'ri-steering-2-line',
      to: '/drivers',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('vehicle:read')"
    :item="{
      title: 'Kendaraan',
      icon: 'ri-bus-line',
      to: '/vehicles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('facility:read')"
    :item="{
      title: 'Fasilitas',
      icon: 'ri-building-line',
      to: '/facilities',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('route:read')"
    :item="{
      title: 'Rute',
      icon: 'ri-road-map-line',
      to: '/routes',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('contract:read')"
    :item="{
      title: 'Kontrak',
      icon: 'ri-file-list-3-line',
      to: '/contracts',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('order:read')"
    :item="{
      title: 'Pesanan',
      icon: 'ri-file-add-line',
      to: '/orders',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('trip_sheet:read')"
    :item="{
      title: 'Trip Sheet',
      icon: 'ri-clipboard-line',
      to: '/trip-sheets',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('shuttle:read')"
    :item="{
      title: 'Antar Jemput',
      icon: 'ri-bus-2-line',
      to: '/shuttles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('vehicle-service:read')"
    :item="{
      title: 'Layanan Kendaraan',
      icon: 'ri-tools-line',
      to: '/vehicle-services',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('user:read')"
    :item="{
      title: 'Pengguna',
      icon: 'ri-user-3-line',
      to: '/users',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('role:read')"
    :item="{
      title: 'Peran',
      icon: 'ri-shield-user-line',
      to: '/roles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('role:update')"
    :item="{
      title: 'Hak Akses Peran',
      icon: 'ri-shield-keyhole-line',
      to: '/role-permissions',
    }"
  />
</template>

