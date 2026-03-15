<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'

const router = useRouter()
const { login } = useSession()

const form = reactive({
  fullName: '',
  groupName: '',
})

const errorMessage = ref('')
const isSubmitting = ref(false)

const submit = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await login({
      fullName: form.fullName,
      groupName: form.groupName,
    })

    await router.push('/menu')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось войти'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="screen auth-screen">
    <div class="backdrop-glow"></div>

    <div class="panel auth-panel">
      <p class="eyebrow">Башня Студвесны</p>
      <h1 class="title">Вход в игру</h1>
      <p class="subtitle">Укажите ваше имя и группу, чтобы продолжить.</p>

      <form class="auth-form" @submit.prevent="submit">
        <label class="field-label" for="fullName">Имя и фамилия</label>
        <input
          id="fullName"
          v-model="form.fullName"
          autocomplete="name"
          class="field-input"
          maxlength="100"
          placeholder="Иван Иванов"
          required
        />

        <label class="field-label" for="groupName">Группа</label>
        <input
          id="groupName"
          v-model="form.groupName"
          class="field-input"
          maxlength="30"
          placeholder="A-101"
          required
        />

        <button class="primary-btn" :disabled="isSubmitting" type="submit">
          {{ isSubmitting ? 'Входим...' : 'Войти' }}
        </button>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      </form>
    </div>
  </section>
</template>
