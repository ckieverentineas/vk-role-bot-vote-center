import { KeyboardBuilder } from "vk-io"
import prisma from "./module/prisma_client"
import { root, vk } from "../.."
import { Edit_Message } from "../core/helper";

export async function Exit(context: any) {
    const text = `💡 Сессия успешно завершена. Чтобы начать новую, напишите [!банк] без квадратных скобочек`
    await Edit_Message(context, text)
    await vk.api.messages.sendMessageEventAnswer({
        event_id: context.eventId,
        user_id: context.userId,
        peer_id: context.peerId,
        event_data: JSON.stringify({
            type: "show_snackbar",
            text: "🔔 Выход из системы успешно завершен!"
        })
    })
}