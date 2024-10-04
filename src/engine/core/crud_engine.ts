import { KeyboardBuilder } from "vk-io";
import prisma from "../events/module/prisma_client";
import { Account, Blank, Candidate } from "@prisma/client";
import { answerTimeLimit, timer_text } from "../..";
import { Confirm_User_Success, Logger } from "./helper";

// Допустимые сущности и их типы
type EntityKeys = 'Blank' | 'Candidate';

type EntityModel = {
    Blank: Blank;
    Candidate: Candidate;
};

// Маппинг типов для PrismaClient
type EntityPrismaClient = {
    [K in EntityKeys]: {
        findMany: (args: any) => Promise<EntityModel[K][]>;
        count: (args: any) => Promise<number>;
        create: (args: any) => Promise<EntityModel[K]>;
        update: (args: any) => Promise<EntityModel[K]>;
        delete: (args: any) => Promise<EntityModel[K] | null>;
        findFirst: (args: any) => Promise<EntityModel[K] | null>;
    };
};

const entityPrisma: EntityPrismaClient = {
    Blank: prisma.blank,
    Candidate: prisma.candidate,
};

// Обобщенный класс EntityManager
class EntityManager<T extends EntityKeys> {
    entityName: T;

    constructor(entityName: T) {
        this.entityName = entityName;
    }

    async getEntities(cursor: number, additionalWhere: any = {}) {
        const batchSize = 5;
        const entities = await entityPrisma[this.entityName].findMany({ where: additionalWhere });
        return entities.slice(cursor, cursor + batchSize);
    }

    async countEntities(additionalWhere: any = {}) {
        return await entityPrisma[this.entityName].count({ where: additionalWhere });
    }

    async createEntity(data: Omit<EntityModel[T], 'id'> & { [key: string]: any }) {
        return await entityPrisma[this.entityName].create({ data });
    }

    async updateEntity(id: number, data: Partial<Omit<EntityModel[T], 'id'>>) {
        return await entityPrisma[this.entityName].update({ where: { id }, data });
    }

    async deleteEntity(id: number) {
        return await entityPrisma[this.entityName].delete({ where: { id } });
    }

    async findEntity(id: number) {
        return await entityPrisma[this.entityName].findFirst({ where: { id } });
    }
}

// Тип для результата действия
type ActionResult = {
    cursor: number;
    stop?: boolean;
};

// Общая функция управления сущностями
async function handleAction(context: any, user: Account, actionType: string, entityManager: EntityManager<EntityKeys>, data: any, additionalParams: any): Promise<ActionResult> {
    switch (actionType) {
        case 'edit':
            return await editEntity(context, entityManager, data);
        case 'delete':
            return await deleteEntity(context, entityManager, data);
        case 'create':
            return await createEntity(context, entityManager, user, additionalParams);
        case 'return':
            return { cursor: data.cursor, stop: true };
        default:
            return { cursor: data.cursor };
    }
}

export async function entityPrinter(context: any, entityName: EntityKeys, additionalParams: any) {
    const user = await prisma.account.findFirst({ where: { idvk: context.senderId } });
    if (!user) {
        await context.send("❌ Пользователь не найден.");
        return;
    }

    const entityManager = new EntityManager(entityName);
    let cursor = 0;
    const limit = 5;
    let isRunning = true;

    while (isRunning) {
        const keyboard = new KeyboardBuilder();
        const entities = await entityManager.getEntities(cursor, { ...additionalParams });
        let eventLogger = '';

        for (const entity of entities) {
            keyboard.textButton({
                label: `✏ ${entity.id}-${entity.name.slice(0, 30)}`,
                payload: { command: `${entityName}_edit`, cursor, id_entity: entity.id },
                color: 'secondary',
            })
            .textButton({
                label: `⛔`,
                payload: { command: `${entityName}_delete`, cursor, id_entity: entity.id },
                color: 'secondary',
            }).row();
            eventLogger += `💬 ${entity.id} - ${entity.name}\n`;
        }

        if (entities.length === 0) {
            await context.send("🔍 Сущности не найдены.");
        }

        if (cursor > 0) {
            keyboard.textButton({ label: `←`, payload: { command: `${entityName}_back`, cursor: -5+cursor }, color: 'secondary' });
        }

        const entityCount = await entityManager.countEntities({ ...additionalParams });
        if (cursor + limit < entityCount) {
            keyboard.textButton({ label: `→`, payload: { command: `${entityName}_next`, cursor: cursor+5 }, color: 'secondary' });
        }

        keyboard.textButton({ label: `➕`, payload: { command: `${entityName}_create`, cursor }, color: 'secondary' }).row()
        .textButton({ label: `🚫`, payload: { command: `${entityName}_return`, cursor }, color: 'secondary' }).oneTime();

        eventLogger += `\n${1 + cursor} из ${entityCount}`;
        
        const response = await context.question(`🧷 Выберите предмет:\n\n ${eventLogger}`, {
            keyboard,
            answerTimeLimit,
        });

        if (response.isTimeout) {
            await context.send(`⏰ Время ожидания выбора предмета истекло!`);
            return;
        }

        if (!response.payload) {
            await context.send(`💡 Жмите только по кнопкам с иконками!`);
        } else {
            const result = await handleAction(context, user, response.payload.command.split('_')[1], entityManager, response.payload, additionalParams);
            cursor = result.cursor ?? cursor;
            isRunning = result.stop !== true;
        }
    }
}


async function editEntity(context: any, entityManager: EntityManager<EntityKeys>, data: any): Promise<ActionResult> {
    const entity = await entityManager.findEntity(data.id_entity);
    if (!entity) {
        await context.send(`❌ Сущность не найдена.`);
        return { cursor: data.cursor };
    }
    
    let newName = await getInput(context, `🧷 Введите новое название для ${entity.name}:`);
    if (newName) {
        await entityManager.updateEntity(entity.id, { name: newName });
        await Logger(`Updated ${entityManager.entityName}: ${entity.id}-${newName}`);
        await context.send(`⚙ Вы изменили название на ${newName}`);
    }
    return { cursor: data.cursor };
}

async function deleteEntity(context: any, entityManager: EntityManager<EntityKeys>, data: any): Promise<ActionResult> {
    const entity = await entityManager.findEntity(data.id_entity);
    if (!entity) {
        await context.send(`❌ Сущность не найдена.`);
        return { cursor: data.cursor };
    }
    
    const confirm = await Confirm_User_Success(context, `удалить ${entityManager.entityName} ${entity.id}-${entity.name}?`);
    await context.send(`${confirm.text}`);
    
    if (confirm.status) {
        await entityManager.deleteEntity(entity.id);
        await Logger(`Deleted ${entityManager.entityName}: ${entity.id}-${entity.name}`);
        await context.send(`Вы удалили ${entityManager.entityName}: ${entity.name}!`);
    }
    return { cursor: data.cursor };
}

async function createEntity(context: any, entityManager: EntityManager<EntityKeys>, user: Account, additionalParams: any): Promise<ActionResult> {
    let name = await getInput(context, `🧷 Введите название добавляемого ${entityManager.entityName}:`);
    if (name) {
        const newEntity = await entityManager.createEntity({ name, ...additionalParams });
        await Logger(`Created ${entityManager.entityName}: ${newEntity.id}-${newEntity.name}`);
        await context.send(`⚙ Вы добавили новый ${entityManager.entityName} ${newEntity.name}`);
    }
    return { cursor: 0 };
}

async function getInput(context: any, message: string) {
    const response = await context.question(message, timer_text);
    if (response.isTimeout) {
        await context.send(`⏰ Время ожидания ввода истекло!`);
        return null;
    }
    if (response.text.length > 300) {
        await context.send(`💡 Вводите до 300 символов!`);
        return null;
    }
    return response.text;
}
