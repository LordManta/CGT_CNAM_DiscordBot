# CGT\_CNAM\_DiscordBot

**Authors:** Jean-Ferdy Susini\
**ReCreated:** 28/09/2024 23:21\
**Version:** 1.1.0\
**Build**: 48\
**Copyleft 2024**

_Robot toujours en cours de développement il est hébergé publiquement afin de palier au crash récent de mon raspberry pi_\
\
Ce robot side à la gestion du serveur discord du syndicat.

Quick start:
------------

On recupère l'archive contenant le code :

```bash
git clone https://github.com/LordManta/CGT_CNAM_DiscordBot.git
```

Il n'y a aucune donnée personnel dans l'archive, donc il faut rajouter les fichiers suivants :

- `CGT\_settings.json` :

```json
{
  "CGT":{
    "guild_id": "XXXXXXXXXXXXXXXXXX"
  , "welcome_chan_id": "XXXXXXXXXXXXXXXXXX"
  , "welcome_msg_id": "XXXXXXXXXXXXXXXXXX"
  , "commander_channel_id": "XXXXXXXXXXXXXXXXXXX"
  , "role_animateur": "XXXXXXXXXXXXXXXXXX"
  , "role_curieux": "XXXXXXXXXXXXXXXXXX"
  , "role_elu": "XXXXXXXXXXXXXXXXXX"
  , "role_syndique": "XXXXXXXXXXXXXXXXXX"
  , "role_CE": "XXXXXXXXXXXXXXXXXX"
  , "role_bureau": "XXXXXXXXXXXXXXXXXX"
    }
}
```
qui contient les identifiants discord des principaux rôles et des principaux salons et messages...

- `settings.json` : qui contient l'identifiant du robot sur la plateforme discord.

- et enfin `members.json` : qui contient la liste au format JSON des membres identifiés.
