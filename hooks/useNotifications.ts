import { supabase } from '@/lib/supabase'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications(userId: string | undefined) {
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    if (!userId) {
      console.log('useNotifications: userId vazio, abortando')
      return
    }

    console.log('useNotifications: iniciando para userId', userId)
    registrarPush(userId)

    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => console.log('Notificacao recebida:', notification)
    )

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => console.log('Notificacao clicada:', response)
    )

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current)
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [userId])
}

async function registrarPush(userId: string) {
  console.log('registrarPush: iniciando...')

  if (!Device.isDevice) {
    console.log('registrarPush: nao e dispositivo fisico, abortando')
    return
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  console.log('registrarPush: permissao atual:', existingStatus)

  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
    console.log('registrarPush: nova permissao:', finalStatus)
  }

  if (finalStatus !== 'granted') {
    console.log('registrarPush: permissao negada, abortando')
    return
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Cartinho',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
    })
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '3469d2bf-f105-4dbf-9c5c-86dd22381987',
    })
    const token = tokenData.data
    console.log('registrarPush: token obtido:', token)

    const { error } = await (supabase as any).from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
    }, { onConflict: 'user_id' })

    if (error) {
      console.log('registrarPush: erro ao salvar token:', error)
    } else {
      console.log('registrarPush: token salvo com sucesso!')
    }
  } catch (err) {
    console.log('registrarPush: erro ao obter token:', err)
  }
}