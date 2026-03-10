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
    v-if="authStore.hasPermission('role:read')"
    :item="{
      title: 'Role',
      icon: 'ri-shield-user-line',
      to: '/roles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('role:update')"
    :item="{
      title: 'Role Permission',
      icon: 'ri-shield-keyhole-line',
      to: '/role-permissions',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('user:read')"
    :item="{
      title: 'User',
      icon: 'ri-user-3-line',
      to: '/users',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('driver:read')"
    :item="{
      title: 'Driver',
      icon: 'ri-steering-2-line',
      to: '/drivers',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('vehicle:read')"
    :item="{
      title: 'Vehicle',
      icon: 'ri-bus-line',
      to: '/vehicles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('facility:read')"
    :item="{
      title: 'Facility',
      icon: 'ri-building-line',
      to: '/facilities',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('route:read')"
    :item="{
      title: 'Route',
      icon: 'ri-road-map-line',
      to: '/routes',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('contract:read')"
    :item="{
      title: 'Contract',
      icon: 'ri-file-list-3-line',
      to: '/contracts',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('shuttle:read')"
    :item="{
      title: 'Shuttle',
      icon: 'ri-bus-2-line',
      to: '/shuttles',
    }"
  />
  <VerticalNavLink
    v-if="authStore.hasPermission('vehicle-service:read')"
    :item="{
      title: 'Vehicle Service',
      icon: 'ri-tools-line',
      to: '/vehicle-services',
    }"
  />
</template>
