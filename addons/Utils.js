module.exports = {
	validateAppUrl: (url, secret_key) => {
		const query_params = url.slice(url.indexOf("?") + 1).split("&").reduce((a, x) => {
			const data = x.split("=");
			a[data[0]] = data[1];
			return a;
		}, {});
		const sign_params = {};
		Object.keys(query_params).sort().forEach((key) => {
			if (!key.startsWith("vk_")) return;
			sign_params[key] = query_params[key];
		});
		const sign_str = Object.keys(sign_params).reduce((a, x) => {
			a.push(x + "=" + sign_params[x]);
			return a;
		}, []).join("&");
		var sign = require("crypto").createHmac('sha256', secret_key).update(sign_str).digest().toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=$/, '');
		var status = sign === query_params["sign"];
		var statu = {
			status: status,
			sign: sign,
			vk: query_params['sign']
		};
		return statu;
	},
	getUrlVars: function (url) {
		var hash;
		var myJson = {};
		var hashes = url.slice(url.indexOf('?') + 1).split('&');
		for (var i = 0; i < hashes.length; i++) {
			hash = hashes[i].split('=');
			myJson[hash[0]] = hash[1];
		}
		return myJson;
	},
	random: function (x, y) {
		return y ? Math.round(Math.random() * (y - x)) + x : Math.round(Math.random() * x);
	},
	pick: (m) => {
		function random(x, y) {
			return y ? Math.round(Math.random() * (y - x)) + x : Math.round(Math.random() * x);
		}
		var i = random(0,m.length-1);
		return {
			res: m[i],
			index: i
		}
	},
	getUnix: () => {
		return new Date().getTime();
	},
	save: (file = "users", data = []) => {
		require('fs').writeFileSync(`./database/${file}.json`, JSON.stringify(data, null, "\t"));
	},
	number_format: (number, decimals, dec_point, thousands_sep) => {
		var i, j, kw, kd, km;
		if (isNaN(decimals = Math.abs(decimals))) {
			decimals = 2;
		}
		if (dec_point == undefined) {
			dec_point = ".";
		}
		if (thousands_sep == undefined) {
			thousands_sep = " ";
		}
		i = parseInt(number = (+number || 0).toFixed(decimals)) + "";
		if ((j = i.length) > 3) {
			j = j % 3;
		} else {
			j = 0;
		}
		km = (j ? i.substr(0, j) + thousands_sep : "");
		kw = i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands_sep);
		kd = (decimals ? dec_point + Math.abs(number - i).toFixed(decimals).replace(/-/, 0).slice(2) : "");
		return km + kw + kd;
	}
}