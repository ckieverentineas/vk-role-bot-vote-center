import { Keyboard } from "vk-io";
import prisma from "../prisma_client";
import { answerTimeLimit, chat_id } from "../../../..";
import { User_Info } from "../tool";
import { Keyboard_Index, Logger, Send_Message } from "../../../core/helper";
import { ico_list } from "../data_center/icons_lib";

export async function Account_Register(context: any) {
    //проверяем есть ли пользователь в базах данных
	const user_check = await prisma.account.findFirst({ where: { idvk: context.senderId } })
	//если пользователя нет, то начинаем регистрацию
	if (!user_check) {
		//согласие на обработку
		const answer = await context.question(`${ico_list['load'].ico} Вы входите в Центр Голосований, из ниоткуда перед вами предстали две девушки и произнесли: \n— Мистер Фэлтс говорил нам о вас. Но прежде чем продолжить, распишитесь здесь о своем согласии на обработку персональных данных. \nВ тот же миг в их руках магическим образом появился пергамент. \n${ico_list['help'].ico} У вас есть 5 минут на принятие решения!`,
			{	
				keyboard: Keyboard.builder()
				.textButton({ label: '✏', payload: { command: 'Согласиться' }, color: 'positive' }).row()
				.textButton({ label: '👣', payload: { command: 'Отказаться' }, color: 'negative' }).oneTime(),
				answerTimeLimit
			}
		);
		if (answer.isTimeout) { return await context.send(`${ico_list['time'].ico} Время ожидания подтверждения согласия истекло!`) }
		if (!/да|yes|Согласиться|конечно|✏/i.test(answer.text|| '{}')) {
			await context.send(`${ico_list['cancel'].ico} Вы отказались дать свое согласие на участие в опросах!`);
			return;
		}
		//приветствие игрока
		const visit = await context.question(`${ico_list['load'].ico} Дав свое согласие, вы, стараясь не оценивать взглядом девушек, вошли в личный кабинет Центра Голосований, и увидели крысу, что в активных поисках сыра и плесени.`,
			{ 	
				keyboard: Keyboard.builder()
				.textButton({ label: 'Убить крысу', payload: { command: 'Согласиться' }, color: 'positive' }).row()
				.textButton({ label: 'Заорать!', payload: { command: 'Согласиться' }, color: 'secondary' }).row()
				.textButton({ label: 'Дать сыра и плесени', payload: { command: 'Отказаться' }, color: 'negative' }).oneTime().inline(),
				answerTimeLimit
			}
		);
		if (visit.isTimeout) { return await context.send(`${ico_list['time'].ico} Время ожидания активности истекло!`) }
		const save = await prisma.account.create({	data: {	idvk: context.senderId, role: 1 } })
		const info = await User_Info(context)
		await context.send(`${ico_list['load'].ico} Крыс отвлекся от дел, заприметив вас, подошел и сказал.\n- Добро пожаловать на трибуны ораторского искуства! \nИ протянул вам пропуск гражданина Legacy.\n${ico_list['save'].ico} Вы получили картотеку, ${info.first_name}\n${ico_list['cardg'].ico} GUID: ${save.id}. \n${ico_list['monitor'].ico} idvk: ${save.idvk}\n${ico_list['date'].ico} Дата Регистрации: ${save.crdate}\n`)
		await Logger(`In database created new user with uid [${save.id}] and idvk [${context.senderId}]`)
		const ans_selector = `${ico_list['save'].ico} Сохранение аккаунта участника GUID-${save.id}:\n👤 @id${save.idvk}(${info.first_name} ${info?.last_name})`
		await Send_Message(chat_id, `${ans_selector}`)
		await Keyboard_Index(context, `${ico_list['help'].ico} Подсказка: Когда все операции вы успешно завершили, напишите [!голос] без квадратных скобочек, а затем нажмите кнопку: ✅Подтвердить авторизацию!`)
	} else {
		await Keyboard_Index(context, `${ico_list['load'].ico} Загрузка, пожалуйста подождите...`)
	}
}