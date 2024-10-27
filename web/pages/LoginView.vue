<template>
  <div class="min-h-screen bg-base-200 flex items-center">
    <div class="card mx-auto w-full max-w-sm bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Login</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Username</span>
            </label>
            <input 
              type="text" 
              v-model="username" 
              placeholder="Username" 
              class="input input-bordered" 
              required
            >
          </div>
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input 
              type="password" 
              v-model="password" 
              placeholder="Password" 
              class="input input-bordered" 
              required
            >
          </div>
          <div class="form-control mt-6">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Loading...' : 'Login' }}
            </button>
          </div>
          <div v-if="error" class="alert alert-error mt-4">
            <span>{{ error }}</span>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import * as Sentry from '@sentry/vue'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await axios.post(`${window.baseURL}/api/auth/login`, {
      username: username.value,
      password: password.value
    }, {
      withCredentials: true
    })
    
    await router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed'
    Sentry.captureException({msg: 'Login failed', err})
  } finally {
    loading.value = false
  }
}
</script>