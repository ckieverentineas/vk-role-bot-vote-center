import { HearManager } from "@vk-io/hear";
import { Keyboard, KeyboardBuilder } from "vk-io";
import { IQuestionMessageContext } from "vk-io-question";
import { answerTimeLimit, chat_id, root, timer_text, timer_text_oper, vk } from '../index';
import { Confirm_User_Success, Fixed_Number_To_Five, Input_Text, Keyboard_Index, Logger, Send_Message } from "./core/helper";
import prisma from "./events/module/prisma_client";
import { User_Info } from "./events/module/tool";
import { entityPrinter } from "./core/crud_engine";
import { Account, Blank, Candidate, Vote } from "@prisma/client";
import { Simply_Carusel_Selector } from "./core/simply_carusel_selector";
import { ico_list } from "./events/module/data_center/icons_lib";

export function registerUserRoutes(hearManager: HearManager<IQuestionMessageContext>): void {
    hearManager.hear(/!админка/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        if (context.senderId == root) {
            const user: Account | null = await prisma.account.findFirst({ where: { idvk: Number(context.senderId) } })
            if (!user) { return }
            const lvlup = await prisma.account.update({ where: { id: user.id }, data: { role: 3 } })
            if (lvlup) {
                await context.send(`⚙ Рут права получены`)
            } else {
                await context.send(`⚙ Ошибка`)
            }
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(${user.idvk}) становится администратором!)`
            })
            await Logger(`Super user ${context.senderId} got root`)
        }
        await Keyboard_Index(context, `💡 Захват мира снова в теме!`)
    })
    hearManager.hear(/!права/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_adm: Account | null | undefined = await prisma.account.findFirst({ where: { idvk: Number(context.senderId) } })
        if (!user_adm) { return }
        if (user_adm.role == 1) { return }
        const uid = await context.question(`🧷 Введите 💳UID банковского счета получателя:`, timer_text)
        if (uid.isTimeout) { return await context.send(`⏰ Время ожидания ввода банковского счета истекло!`) }
		if (uid.text) {
            const get_user = await prisma.account.findFirst({ where: { id: Number(uid.text) } })
            if (!get_user) { return }
            await context.send(`✉ Открыта следующая карточка:\n\n💳 UID: ${get_user.id}\n🧷 Страница: https://vk.com/id${get_user.idvk}\n Права пользователя: ${get_user.role} `)
            const keyboard = new KeyboardBuilder()
            keyboard.textButton({ label: 'Дать админку', payload: { command: 'access' }, color: 'secondary' }).row()
            .textButton({ label: 'Снять админку (в том числе супер)', payload: { command: 'denied' }, color: 'secondary' }).row()
            if (user_adm.role == 3) {
                keyboard.textButton({ label: 'Дать Супер админку', payload: { command: 'access_pro' }, color: 'secondary' }).row()
            }
            keyboard.textButton({ label: 'Ничего не делать', payload: { command: 'cancel' }, color: 'secondary' }).row()
            keyboard.oneTime().inline()
            const answer1 = await context.question(`⌛ Что будем делать?`, { keyboard: keyboard, answerTimeLimit })
            if (answer1.isTimeout) { return await context.send(`⏰ Время ожидания изменения прав истекло!`) }
            if (!answer1.payload) {
                await context.send(`💡 Жмите только по кнопкам с иконками!`)
            } else {
                if (answer1.payload.command === 'access') {
                    const lvlup = await prisma.account.update({ where: { id: get_user.id }, data: { role: 2 } })
                    if (lvlup) {
                        await context.send(`⚙ Администратором становится ${get_user.idvk}`)
                        try {
                            await vk.api.messages.send({
                                user_id: get_user.idvk,
                                random_id: 0,
                                message: `⚙ Вас назначили администратором`
                            })
                            await context.send(`⚙ Операция назначения администратора завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${get_user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Root) > делает администратором @id${get_user.idvk}(${get_user.idvk})`
                        })
                        await Logger(`In private chat, get status admin user ${get_user?.idvk}-${get_user?.id} by admin ${context.senderId}`)
                    } else {
                        await context.send(`💡 Ошибка`)
                    }
                }
                if (answer1.payload.command === 'access_pro') {
                    const lvlup = await prisma.account.update({ where: { id: get_user.id }, data: { role: 3 } })
                    if (lvlup) {
                        await context.send(`⚙ Супер Администратором становится ${get_user.idvk}`)
                        try {
                            await vk.api.messages.send({
                                user_id: get_user.idvk,
                                random_id: 0,
                                message: `⚙ Вас назначили Супер администратором`
                            })
                            await context.send(`⚙ Операция назначения Супер администратора завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${get_user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Root) > делает Супер администратором @id${get_user.idvk}(${get_user.idvk})`
                        })
                        await Logger(`In private chat, get status admin user ${get_user?.idvk}-${get_user?.id} by admin ${context.senderId}`)
                    } else {
                        await context.send(`💡 Ошибка`)
                    }
                }
                if (answer1.payload.command === 'denied') {
                    const lvlup = await prisma.account.update({ where: { id: get_user.id }, data: { role: 1 } })
                    if (lvlup) {
                        await context.send(`⚙ Обычным пользователем становится ${get_user.idvk}`)
                        try {
                            await vk.api.messages.send({
                                user_id: get_user.idvk,
                                random_id: 0,
                                message: `⚙ Вас понизили до обычного пользователя`
                            })
                            await context.send(`⚙ Операция назначения пользователем завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${get_user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Root) > делает обычным пользователем @id${get_user.idvk}(${get_user.idvk})`
                        })
                        await Logger(`In private chat, left status admin user ${get_user?.idvk}-${get_user?.id} by admin ${context.senderId}`)
                    } else {
                        await context.send(`💡 Ошибка`)
                    }
                }
                if (answer1.payload.command === 'cancel') {
                    await context.send(`💡 Тоже вариант`)
                }
            }
		} else {
			await context.send(`💡 Нет такого банковского счета!`)
		}
        await Keyboard_Index(context, `💡 Повышение в должности, не всегда понижение!`)
    })
    hearManager.hear(/!енотик/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        if (context.senderId != root) { return }
        await context.sendDocuments({ value: `./prisma/dev.db`, filename: `dev.db` }, { message: '💡 Открывать на сайте: https://sqliteonline.com/' } );
        await vk.api.messages.send({
            peer_id: chat_id,
            random_id: 0,
            message: `‼ @id${context.senderId}(Admin) делает бекап баз данных dev.db.`
        })
        await Logger(`In private chat, did backup database by admin ${context.senderId}`)
        await Keyboard_Index(context, `💡 Клонирование разрешено!`)
    })
    hearManager.hear(/!голос|!Голос/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const user_inf = await User_Info(context)
        const keyboard = new KeyboardBuilder()
		.textButton({ label: `📬 Голосовать`, payload: { command: 'card_enter' }, color: 'secondary' }).row()
		.textButton({ label: '📐 Пкметр', payload: { command: 'shop_category_enter' }, color: 'positive' })
    	if (user_check.role != 1) {
    	    keyboard.textButton({ label: '⚙ Бланки', payload: { command: 'card_enter' }, color: 'secondary' })
            .textButton({ label: '👥 Кандидаты', payload: { command: 'inventory_enter' }, color: 'primary' })
            .textButton({ label: '👀 Бланки', payload: { command: 'inventory_enter' }, color: 'primary' })
    	}
    	keyboard.callbackButton({ label: '🚫', payload: { command: 'exit' }, color: 'secondary' }).oneTime().inline()
		await Send_Message(user_check.idvk, `🛰 Вы в системе голосований, ${user_inf.first_name}, что изволите?`, keyboard)
        await Logger(`(private chat) ~ enter in main menu system is viewed by <user> №${context.senderId}`)
    })
    hearManager.hear(/📬 Голосовать/, async (context) => {
        if (context.peerType == 'chat') { return }
        const account  = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!account) { return }
        // изменение названия факультета
        const blank_name = await Input_Text(context, `Введите ключ доступа к голосованию.\n${ico_list['help'].ico}Отправьте сообщение в чат для изменения:`)
        if (!blank_name) { return }
        const blank_verify = await prisma.blank.findFirst({ where: { token: blank_name } })
        if (!blank_verify) { await context.send('Голосование не найдено'); return await Keyboard_Index(context, `⌛ Изменение, отец учения, выдаем кнопку вызова спутника...`) }
        let wotker = true
        while (wotker) {
            const blank_list: Candidate[] = await prisma.candidate.findMany({ where: { id_blank: blank_verify.id } })
            const vote_list: Vote[] = await prisma.vote.findMany({ where: { id_account: account.id } })
            // Получаем id кандидатов из vote_list
            const votedCandidateIds = new Set(vote_list.map(vote => vote.id_candidate));
            // Фильтруем blank_list, исключая тех кандидатов, которые есть в votedCandidateIds
            const filteredBlankList = blank_list.filter(candidate => !votedCandidateIds.has(candidate.id));
            const blank_id_sel = await Simply_Carusel_Selector(
                context,
                `Выберите кандидата, чтобы проголосовать:`,
                filteredBlankList,
                async (item) => `\n\n${ico_list['card'].ico}  №${item.id} <--\n${ico_list['person'].ico} Кандидат: ${item.name}\n`,
                (item) => `🎯 №${item.id}-${item.name.slice(0,30)}`, // labelExtractor
                (item, index) => ({ command: 'builder_control', id_item_sent: index, id_item: item.id }) // payloadExtractor
            );
            if (!blank_id_sel) { return }
            const voter = await prisma.vote.create({ data: { id_account: account.id, id_candidate: blank_id_sel } })
            if (voter) { await context.send(`Ваш голос за кандидата №${voter.id} принят`)}
            const confirm: { status: boolean, text: String } = await Confirm_User_Success(context, `проголосовать еще за когото??`)
    	    //await context.send(`${confirm.text}`)
    	    if (!confirm.status) { wotker = false }
        }
        await Keyboard_Index(context, `💡 Властью движут люди, хоть где-то!`)
    })
    hearManager.hear(/⚙ Бланки/, async (context) => {
        if (context.peerType == 'chat') { return }
        const account  = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!account) { return }
        await entityPrinter(context, 'Blank', { id_account: account.id });
        await Keyboard_Index(context, `💡 Создание, редактирование, удаление и получение бланков, как искусство!`)
    })
    hearManager.hear(/👥 Кандидаты/, async (context) => {
        if (context.peerType == 'chat') { return }
        const account  = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!account) { return }
        const blank_list: Blank[] = await prisma.blank.findMany({ where: { id_account: account.id } })
        const blank_id_sel = await Simply_Carusel_Selector(
            context,
            `Выберите бланк для управления кандидатами`,
            blank_list,
            async (item) => `\n\n${ico_list['lock'].ico} Голосование №${item.id} <--\n${ico_list['alliance'].ico} Название: ${item.name}\n`,
            (item) => `🌐 №${item.id}-${item.name.slice(0,30)}`, // labelExtractor
            (item, index) => ({ command: 'builder_control', id_item_sent: index, id_item: item.id }) // payloadExtractor
        );
        if (!blank_id_sel) { return }
        await entityPrinter(context, 'Candidate', { id_blank: blank_id_sel });
        await Keyboard_Index(context, `💡 Добавьте только лучших из лучших, зачем все эти голосования?!`)
    })
    hearManager.hear(/👀 Бланки/, async (context) => {
        if (context.peerType == 'chat') { return }
        const account  = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!account) { return }
        const blank_list: Blank[] = await prisma.blank.findMany({ where: { id_account: account.id } })
        const blank_id_sel = await Simply_Carusel_Selector(
            context,
            `Выберите бланк для настройки доступа`,
            blank_list,
            async (item) => `\n\n${ico_list['lock'].ico} Голосование №${item.id} <--\n${ico_list['alliance'].ico} Название: ${item.name}\n`,
            (item) => `🌐 №${item.id}-${item.name.slice(0,30)}`, // labelExtractor
            (item, index) => ({ command: 'builder_control', id_item_sent: index, id_item: item.id }) // payloadExtractor
        );
        if (!blank_id_sel) { return }
        const stat: { rank: number, text: string, score: number }[] = []
        let counter = 1
        for (const cand of await prisma.candidate.findMany({ where: { id_blank: blank_id_sel } })) {
            const coun = await prisma.vote.count({ where: { id_candidate: cand.id } })
            stat.push({
                rank: counter,
                text: `${ico_list['person'].ico} - UID-${cand.id} ${cand.name} --> ${coun}${ico_list['date'].ico}\n`,
                score: coun,
            })
            counter++
        }
        stat.sort(function(a, b){
            return b.score - a.score;
        });
        let outputText = stat.map(item => item.text).join('');
        outputText += `\n\n${ico_list['help'].ico} В статистике участвует ${counter-1} персонажей`
        const keyboard = new KeyboardBuilder()
        .textButton({ label: `${ico_list['edit'].ico} Бланк ${blank_id_sel}`, payload: { command: 'alliance_enter' }, color: 'secondary' }).inline().oneTime()
        await Send_Message(context.senderId, outputText, keyboard)
        await Keyboard_Index(context, `💡 Статистика и редактирование, всё ради этого!`)
    })
    hearManager.hear(/✏ Бланк|!изменить/, async (context: any) => {
        if (context.peerType == 'chat') { return }
        const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
        if (!user_check) { return }
		const [cmd, xmd, value] = context.text.split(' ');
        const target = parseInt(value)
		const blank_check = await prisma.blank.findFirst({ where: { id_account: user_check.id, id: target } })
		if (!blank_check) { return }
		const confirm: { status: boolean, text: String } = await Confirm_User_Success(context, `изменить ключ доступа к бланку №${blank_check.id}?`)
    	await context.send(`${confirm.text}`)
    	if (!confirm.status) { return; }
		let ender = true
		let text_input = blank_check.token
		while (ender) {
			let censored = text_input
			const corrected: any = await context.question(`🧷 Вы редактируете ключ доступа к анкете ${blank_check.id}.\n🔑 текущий ключ: ${censored}\n`,
				{	
					keyboard: Keyboard.builder()
					.textButton({ label: '!сохранить', payload: { command: 'student' }, color: 'secondary' })
					.textButton({ label: '!отмена', payload: { command: 'citizen' }, color: 'secondary' })
					.oneTime().inline(),
					answerTimeLimit
				}
			)
			if (corrected.isTimeout) { await context.send(`⏰ Время ожидания редактирования ключа истекло!`); await Keyboard_Index(context, `⌛ Обновление клавиатуры...`); return }
			if (corrected.text == '!сохранить') {
				if (text_input.length < 3) { await context.send(`⚠ ключ от 3 символов надо!`); continue }
				ender = false
			} else {
				if (corrected.text == '!отмена') {
					await context.send(`🔧 Вы отменили редактирование ключа`)
					ender = false
					await Keyboard_Index(context, `⌛ Обновление клавиатуры...`); 
					return 
				} else {
					text_input = corrected.text
				}
			}
		}
        const blank_verify = await prisma.blank.findFirst({ where: { token: text_input } })
        if (blank_verify) { return await context.send('Бланк с таким ключем уже зарегистрирован')}
		const blank_edit = await prisma.blank.update({ where: { id: blank_check.id }, data: { token: text_input } })
		await Send_Message(user_check.idvk, `${ico_list['success'].ico} Успешно изменено [${blank_edit.id}]\n📝 Бланк:\n${blank_edit.name}\n🔑 Ключ:\n${blank_edit.token}`)
        await Logger(`(private chat) ~ finished edit self <blank> #${blank_check.id} by <user> №${context.senderId}`)
        await Keyboard_Index(context, `💡 Вы не имели право это сделать, но мы разрешаем!`)
    })
}

    