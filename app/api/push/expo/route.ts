import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const record = payload.record

    // Só dispara quando cria agendamento pendente
    if (!record || record.status !== 'pendente') {
      return NextResponse.json({ ok: true })
    }

    const supabase = createAdminClient()

    // Buscar dados do agendamento
    const { data: ag } = await supabase
      .from('agendamentos')
      .select('*, profiles(full_name), carrinhos(nome), locais(nome)')
      .eq('id', record.id)
      .single()

    if (!ag) return NextResponse.json({ ok: true })

    const usuario  = (ag as any).profiles
    const carrinho = (ag as any).carrinhos
    const local    = (ag as any).locais

    const turnos: Record<string, string> = {
      manha: 'Manha (07h-12h)',
      tarde: 'Tarde (12h-18h)',
      noite: 'Noite (18h-23h)',
    }

    const [dia, mes, ano] = record.data.split('-').reverse()
    const dataFormatada = `${dia}/${mes}/${ano}`

    // Buscar tokens de todos os admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (!admins || admins.length === 0) return NextResponse.json({ ok: true })

    const adminIds = admins.map((a: any) => a.id)

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', adminIds)

    if (!tokens || tokens.length === 0) return NextResponse.json({ ok: true })

    // Enviar via Expo Push API
    const mensagens = tokens.map((t: any) => ({
      to: t.token,
      sound: 'default',
      title: '📅 Nova solicitacao',
      body: `${usuario?.full_name} quer o ${carrinho?.nome} em "${local?.nome}" — ${dataFormatada} ${turnos[record.turno]}`,
      data: { agendamentoId: record.id },
    }))

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(mensagens),
    })

    return NextResponse.json({ ok: true, enviados: tokens.length })
  } catch (err) {
    console.error('Erro push expo:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}