console.log("[ TELEGRAM ADS ] STARTING SERVER...");
const express = require("express");
var fs = require("fs");

const options = {
	key: fs.readFileSync("key.key"),
	cert: fs.readFileSync("cert.crt")
}

const app = express();
const APP_PORT = 8080;
var http = require('https').createServer(options, app);
const io = require('socket.io')(http, {});
var cors = require('cors');
app.use(cors());
app.use(express.json());


var { save } = require("./addons/Utils");
var users = require("./database/users.json");

const TelegramBot = require('node-telegram-bot-api');
const token = '7870844220:AAHqNTXZsP9fDHQpJ8vBX5VubXgNWmK9kvE';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;
	const firstName = msg.from.first_name || '';
	const lastName = msg.from.last_name || '';
	const username = `${firstName} ${lastName}`.trim();
	const text = msg.text?.trim();

	if (!text) return;

	if (userId === 6264259847) {
		// Статистика
		if (text === '/stats') {
		  const totalUsers = users.length;
		  const onlineUsers = users.filter(u => u.online).length;
		  const totalInvited = users.reduce((acc, u) => acc + (u.invited || 0), 0);
		  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
	
		  const statsMessage =
	`📊 Статистика бота:
	👥 Пользователей всего: ${totalUsers}
	🟢 Онлайн сейчас: ${onlineUsers}
	🤝 Всего приглашено: ${totalInvited}
	⭐ Общий баланс: ${totalBalance.toFixed(2)} звёзд`;
	
		  return bot.sendMessage(chatId, statsMessage);
		}
	
		// Рассылка текста: /broadcast текст сообщения
		if (text.startsWith('/broadcast ')) {
		  const broadcastText = text.slice(11).trim();
		  if (!broadcastText) {
			return bot.sendMessage(chatId, '❗️ Текст для рассылки не может быть пустым.');
		  }
	
		  let sentCount = 0;
		  users.forEach(user => {
			bot.sendMessage(user.uid, broadcastText).then(() => {
			  sentCount++;
			  // При желании можно логировать прогресс или выдавать уведомление админу после рассылки
			}).catch(() => {
			  // Игнорируем ошибки отправки, например, пользователь заблокировал бота
			});
		  });
	
		  return bot.sendMessage(chatId, `📣 Рассылка запущена. Сообщение отправляется ${users.length} пользователям.`);
		}
	  }

	if (text.startsWith('/start')) {
		// Проверяем наличие параметра (рефералки)
		const parts = text.split(' ');
		let refId = null;

		if (parts.length > 1 && !isNaN(parts[1])) {
			refId = Number(parts[1]);
		}

		let user = users.find(u => u.uid === userId);

		if (!user) {
			// Новый пользователь
			user = {
				uid: userId,
				nick: username,
				photo: '', // Можно обновить с WebApp
				online: false,
				balance: 0,
				ban: false,
				ref: refId && refId !== userId ? refId : null
			};

			users.push(user);
			save('users', users);

			// Бонус пригласившему
			if (user.ref) {
				const inviter = users.find(u => u.uid === user.ref);
				if (inviter && !inviter.ban) {
					inviter.balance += 2;
					save('users', users);
					bot.sendMessage(inviter.uid, `🎉 У вас новый реферал! +2 звезды`);
				}
			}

			bot.sendMessage(chatId, `👋 Добро пожаловать в WaveStars!

📺 Здесь ты можешь зарабатывать звёзды, просто просматривая рекламу. За каждый просмотр — +0.25 ⭐️

💰 Минимальный вывод: 15 звёзд  
🎁 Приглашай друзей — получай по 2 звезды за каждого!

👇 Нажми на кнопку ниже, чтобы открыть приложение и начать зарабатывать:`, {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '🚀 Перейти в приложение',
								web_app: { url: 'https://192.168.0.108:3000/' } // ← замени на свою ссылку
							}
						]
					]
				}
			});

		} else {
			bot.sendMessage(chatId, `👋 Добро пожаловать в WaveStars!\n\n📺 Здесь ты можешь зарабатывать звёзды, просто просматривая рекламу. За каждый просмотр — +0.25 ⭐️\n\n💰 Минимальный вывод: 15 звёзд\n🎁 Приглашай друзей — получай по 2 звезды за каждого!\n\n👇 Нажми на кнопку ниже, чтобы открыть приложение и начать зарабатывать:`, {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '🚀 Перейти в приложение',
								web_app: { url: 'https://192.168.0.108:3000/' } // ← замени на свою ссылку
							}
						],
						[
							{
								text: '👥 Пригласить друга',
								callback_data: 'show_referral'
							}
						]
					]
				}
			});
		}
	}

});

// Обработка callback кнопок
bot.on('callback_query', (callbackQuery) => {
	const data = callbackQuery.data;
	const msg = callbackQuery.message;
	const userId = callbackQuery.from.id;

	if (data === 'show_referral') {
		const user = users.find(u => u.uid === userId) || { invited: 0 };
		const invitedCount = user.invited || 0;
		const refLink = `https://t.me/wave_stars_bot?start=${userId}`; // Поменяй на свой @username

		const message =
`👥 Ты пригласил: ${invitedCount} друзей

🌟 Приглашай друзей и получай по 2 звезды за каждого!

Отправь этот текст друзьям:

🚀 Хочешь зарабатывать звёзды в Telegram?
Смотри рекламу и получай награды!

🔗 Присоединяйся: ${refLink}`;

		// Редактируем сообщение, не удаляя его
		bot.editMessageText(message, {
			chat_id: msg.chat.id,
			message_id: msg.message_id,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Перейти в приложение',
							web_app: { url: 'https://192.168.0.108:3000/' } // Твоя ссылка на приложение
						}
					]
				]
			}
		});

		bot.answerCallbackQuery(callbackQuery.id);
	}
});

io.on('connection', async function (socket) {
	var vars = socket.handshake.query;
	if (vars) {
		var user = users.find(x => x.uid === Number(vars.uid));
		if (!user) {
			var name = socket.handshake.query.nick;
			var new_name = name.replace(/[^a-zа-яё0-9\s]/gi, " ");
			users.push({
				uid: Number(vars.uid),
				photo: vars.photo,
				nick: new_name,
				online: true,
				balance: 0,
				ban: false
			});
			save("users", users);
			user = users.find(x => x.uid === Number(vars.uid));
		}
		if (user.nick != socket.handshake.query.nick || user.photo != socket.handshake.query.photo) {
			user.nick = socket.handshake.query.nick
			user.photo = socket.handshake.query.photo
		}
		user.online = true;
		save("users", users);
		var datasend = setInterval(() => {
			socket.emit(`response`, {
				'type': 'updateuserdata',
				'balance': user.balance,
				'ban': user.ban,
				'nick': user.nick
			});
		}, 5000);
		socket.emit(`response`, {
			'type': 'userdata',
			'balance': user.balance,
			'ban': user.ban,
			'nick': user.nick
		});
		socket.on(`disconnect`, () => {
			clearInterval(datasend);
			user.online = false;
			save("users", users);
		});
		socket.on(`request`, async (msg) => {
			if (user.ban) {
				return socket.disconnect();
			}
			if (msg.type == "getuserbalance") {
				socket.emit(`response`, {
					'type': 'updatebalance',
					'balance': user.balance
				})
			}
			if (msg.type == "getuser") {
				socket.emit(`response`, {
					type: "getuser",
					data: users.find(x => x.uid === msg.uid) ? [users.find(x => x.uid === msg.uid)] : []
				});
			}
			if (msg.type == 'stars_ads') {
				if (msg.data.result) {
					user.balance += 0.25;
					save("users", users);
					socket.emit(`response`, {
						'type': 'successads',
						'balance': user.balance,
						'sum': 0.25
					});
					return;
				}
				else {
					socket.emit(`response`, {
						'type': 'errorads'
					});
					return;
				}
			}

			if (msg.type == 'gettop') {
				var top = [];
				var resArr = [];
				var myResArr = [];
				var me = 0;

				users.filter(x => {
					top.push({
						id: 0,
						uid: x.uid,
						nick: x.nick,
						photo: x.photo,
						top: x.balance,
						me: x.uid === Number(socket.handshake.query.uid) ? 1 : 0
					});
				});

				top.sort((a, b) => {
					return b.balance - a.balance;
				});

				top.filter((x, i) => {
					if (i < 50) {
						x.id = i + 1;
						resArr.push(x);
						if (x.uid === Number(socket.handshake.query.uid)) {
							myResArr = x;
							me = 1;
						}
					}
				});

				if (me == 0) {
					top.filter((x, i) => {
						x.id = i + 1;
						if (x.uid == Number(socket.handshake.query.uid)) {
							myResArr = x;
							me = 1;
						}
					});
				}
				return socket.emit(`response`, {
					'type': 'datatop',
					'array': resArr,
					'mydata': myResArr
				});
			}
		});
	}
});

setInterval(() => {
	var result = users.filter(x => x.online === true).length;
	io.emit(`response`, {
		'type': 'online',
		'count': result
	});
}, 2000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
