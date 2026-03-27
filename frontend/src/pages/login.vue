<script setup lang="ts">
import { useTheme } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

import logo from '@images/logo.svg?raw'
import authV1MaskDark from '@images/pages/auth-v1-mask-dark.png'
import authV1MaskLight from '@images/pages/auth-v1-mask-light.png'
import authV1Tree2 from '@images/pages/auth-v1-tree-2.png'
import authV1Tree from '@images/pages/auth-v1-tree.png'

const form = ref({
  username: '',
  password: '',
})

const vuetifyTheme = useTheme()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isPasswordVisible = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light'
    ? authV1MaskLight
    : authV1MaskDark
})

const handleLogin = async () => {
  if (isSubmitting.value)
    return

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.login(form.value.username, form.value.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.push(redirect)
  }
  catch (error) {
    if (error instanceof ApiError)
      errorMessage.value = error.message
    else
      errorMessage.value = 'Masuk gagal. Coba lagi.'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card pa-4 pt-7"
      max-width="448"
    >
      <VCardItem class="justify-center">
        <RouterLink
          to="/"
          class="d-flex align-center gap-3"
        >
          <!-- <div
            class="d-flex"
            v-html="logo"
          /> -->
          <h2 class="font-weight-medium text-2xl text-uppercase">
            Partner
          </h2>
        </RouterLink>
      </VCardItem>

      <VCardText class="pt-2">
        <h4 class="text-h4 mb-1">
          Masuk
        </h4>
        <p class="mb-0">
          Masukkan username dan password untuk masuk.
        </p>
      </VCardText>

      <VCardText>
        <VForm @submit.prevent="handleLogin">
          <VRow>
            <VCol
              v-if="errorMessage"
              cols="12"
            >
              <VAlert
                type="error"
                variant="tonal"
              >
                {{ errorMessage }}
              </VAlert>
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="form.username"
                label="Username"
                autocomplete="username"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="form.password"
                label="Password"
                :type="isPasswordVisible ? 'text' : 'password'"
                autocomplete="current-password"
                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                @click:append-inner="isPasswordVisible = !isPasswordVisible"
              />

              <VBtn
                block
                type="submit"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                class="mt-6"
              >
                Masuk
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <VImg
      class="auth-footer-start-tree d-none d-md-block"
      :src="authV1Tree"
      :width="250"
    />

    <VImg
      :src="authV1Tree2"
      class="auth-footer-end-tree d-none d-md-block"
      :width="350"
    />

    <VImg
      class="auth-footer-mask d-none d-md-block"
      :src="authThemeMask"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>

