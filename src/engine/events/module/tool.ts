import { vk } from "../../..";
import { Edit_Message } from "../../core/helper";

export async function User_Info(context: any) {
    let [userData]= await vk.api.users.get({user_id: context.senderId});
    return userData
}
export async function Operation_Enter(context: any) {
    if (context?.eventPayload?.command == "operation_enter") {
        await vk.api.messages.sendMessageEventAnswer({
            event_id: context.eventId,
            user_id: context.userId,
            peer_id: context.peerId,
            event_data: JSON.stringify({
                type: "show_snackbar",
                text: `🔔 Я усталь, я мухажук`
            })
        })
    }
}
export async function Right_Enter(context: any) {
    if (context?.eventPayload?.command == "right_enter") {
        await vk.api.messages.sendMessageEventAnswer({
            event_id: context.eventId,
            user_id: context.userId,
            peer_id: context.peerId,
            event_data: JSON.stringify({
                type: "show_snackbar",
                text: `🔔 Мне несложно, но я просто запарился :(`
            })
        })
    }
}
export async function Exiter(context: any) {
    const text = `🧹 Здесь было сообщение от центра голосований.`
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
