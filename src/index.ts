import { VK, Keyboard } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import {
    QuestionManager,
    IQuestionMessageContext
} from 'vk-io-question';
import { registerUserRoutes } from './engine/player'
import { InitGameRoutes } from './engine/init';
import { Group_Id_Get, Keyboard_Index, Logger, Send_Message, Sleep, Worker_Checker, Worker_Online_Setter } from './engine/core/helper';
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import prisma from './engine/events/module/prisma_client';
import { Exiter, Operation_Enter, Right_Enter, User_Info } from './engine/events/module/tool';
import { Account_Register } from './engine/events/module/person/account';
dotenv.config()

export const token: string = String(process.env.token)
export const root: number = Number(process.env.root) //root user
export const chat_id: number = Number(process.env.chat_id) //chat for logs
export const SECRET_KEY = process.env.SECRET_KEY || '';
export let group_id: number = 0//clear chat group
// Функция для инициализации group_id
const initializeGroupId = async (token: string) => {
    await Group_Id_Get(token).then(async (res) => { 
        await Sleep(1000); 
        group_id = res ?? 0; // Присваиваем group_id
    });
};

// Вызов функции для инициализации group_id
initializeGroupId(token).then(() => {
    if (group_id > 0) {
		setInterval(Worker_Online_Setter.bind(null, group_id), 3600000)
        Logger(`Successfully retrieved group_id: ${group_id}`);
        // Здесь можно продолжить логику с использованием group_id
    } else {
        console.error("Не удалось получить group_id.");
    }
});
export const timer_text = { answerTimeLimit: 300_000 } // ожидать пять минут
export const timer_text_oper = { answerTimeLimit: 60_000 } // ожидать пять минут
export const answerTimeLimit = 300_000 // ожидать пять минут
export const starting_date = new Date(); // время работы бота
//авторизация
export const vk = new VK({ token: token, pollingGroupId: group_id, apiLimit: 20, apiMode: 'parallel_selected' });
//инициализация
const questionManager = new QuestionManager();
const hearManager = new HearManager<IQuestionMessageContext>();

/*prisma.$use(async (params, next) => {
	console.log('This is middleware!')
	// Modify or interrogate params here
	console.log(params)
	return next(params)
})*/

//настройка
vk.updates.use(questionManager.middleware);
vk.updates.on('message_new', hearManager.middleware);

//регистрация роутов из других классов
InitGameRoutes(hearManager)
registerUserRoutes(hearManager)
export const users_pk: Array<{ idvk: number, text: string, mode: boolean }> = []
//миддлевар для предварительной обработки сообщений
vk.updates.on('message_new', async (context: any, next: any) => {
	if (context.peerType == 'chat') { 
		/*
		try { 
			await vk.api.messages.delete({'peer_id': context.peerId, 'delete_for_all': 1, 'cmids': context.conversationMessageId, 'group_id': group_id})
			await Logger(`In chat received a message from the user ${context.senderId} and was deleted`)
			//await vk.api.messages.send({ peer_id: chat_id, random_id: 0, message: `✅🚫 @id${context.senderId} ${context.text}`})  
		} catch (error) { 
			await Logger(`In chat received a message from the user ${context.senderId} and wasn't deleted`)
			//await vk.api.messages.send({ peer_id: chat_id, random_id: 0, message: `⛔🚫 @id${context.senderId} ${context.text}`}) 
		}  */
		return
	}
	await Account_Register(context)
	return next();
})
vk.updates.on('message_event', async (context: any, next: any) => { 
	const config: any = {
		"exit": Exiter,
	}
	try {
		await config[context.eventPayload.command](context)
	} catch (e) {
		await Logger(`Error event detected for callback buttons: ${e}`)
	}
	return await next();
})

vk.updates.start().then(async () => {
	await Logger('running succes');
}).catch(console.error);
setInterval(Worker_Checker, 86400000);

//process.on('warning', e => console.warn(e.stack))