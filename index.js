/*
Robot servant à l'administration collective du serveur discord de la CGT du
CNAM.
*/
const fs= require('fs');
const { Client, Collection , MessageEmbed, Intents}= require('discord.js');
const { token }= require('./settings');
const { CGT }= require('./CGT_settings');
const { performance }= require('perf_hooks');
const { exec }= require('child_process');
let build_count= 48;

global.performance= performance;
require("./SugarCubes_min.js")

global._sc_cgt_getMethods= function(obj){
    const properties= new Set();
    let currentObj= obj;
    do{
      Object.getOwnPropertyNames(currentObj).map(item => properties.add(item));
      }
    while((currentObj= Object.getPrototypeOf(currentObj)));
    return [...properties.keys()].filter(item => typeof obj[item] === 'function');
    };
global._sc_cgt_getFields= function(obj){
    const properties= new Set();
    let currentObj= obj;
    do{
      Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
      }
    while ((currentObj= Object.getPrototypeOf(currentObj)));
    return [...properties.keys()].filter(item => typeof obj[item] !== 'function');
    };
global._sc_cgt_inspect= function(obj){
    console.log(obj);
    console.log("Fields:", _sc_cgt_getFields(obj));
    console.log("Methods:", _sc_cgt_getMethods(obj));
    };

/*
Initialisation du client discord.
L'API a ecore changé ici on doit définir un nouvel objet au moment de
l'import : GatewayIntentBits à la place de Intent. Et les intentions à activer
deviennent : GatewayIntentBits.Guilds etc.
*/
const client= new Client({
      intents: [
        Intents.FLAGS.GUILDS
      , Intents.FLAGS.GUILD_MEMBERS
      , Intents.FLAGS.GUILD_MESSAGES
      , Intents.FLAGS.GUILD_MESSAGE_REACTIONS
        ]
      });
client.cgt_getUserInfo= function(id){
    for(var m of this.CGT_memberList){
      if(id==m.id){
        return m;
        }
      }
    return undefined;
    }
client.cgt_getListMembresNonIdentifies= function(){
    const res=[];
    for(var m of this.CGT_memberList){
      if(""==m.id){
        res.push(m);
        }
      }
    return res;
    };
client.cgt_server_stats= {
    identified: 0
  , expected: 0
  , expecting: 0
  , validated: 0
  , not_validated: 0
  , not_validated_but_known: 0
  , not_validated_and_unknown: 0
  , validation_problems: 0
  , validated_and_identified: 0
  , validated_not_identified: 0
  , num_members: 0
  , has_no_roles: 0
  , syndicated: 0
  , reset: function(){
        this.identified= 0;
        this.expected= 0;
        this.expecting= 0;
        this.validated= 0;
        this.not_validated= 0;
        this.not_validated_but_known= 0;
        this.not_validated_and_unknown= 0;
        this.has_no_roles= 0;
        this.validation_problems= 0;
        this.validated_and_identified= 0;
        this.validated_not_identified= 0;
        this.num_members= 0;
        this.syndicated= 0;
        }
    };
//console.log("Membres non encore identifiés:", client.cgt_getListMembresNonIdentifies());

client.NM_Commands= [
    "./commands/help.js"
  , "./commands/ping.js"
  , "./commands/version.js"
  , "./commands/clean.js"
  , "./commands/roll.js"
  , "./commands/restart.js"
  , "./commands/halt.js"
  , "./commands/vote.js"
  , "./commands/dif.js"
  , "./commands/check.js"
    ];
client.buildNumber= build_count;
client.baseV= 48;
client.version= "1.1.";

global.machine= SC.clock({
      name: "main"
    //, init: SC.pauseForever()
    , dumpTraceFun: function(){
        console.warn.apply(console, arguments);
        }
      });

/*
On active la sortie standard sur la console JS pour pouvoir suivre les infos du
robot (dbug)
*/
machine.setStdOut(SC.writeInConsole);
/*
On crée un ensemble d'événements réactifs qui seront utilisés pour mapper en
réactif les événement async de l'API Discord.
*/
client.Evt_clientReady= SC.evt("clientReady");
client.Evt_guildResolved= SC.evt("guildResolved");
client.Evt_welcomeChannelResolved= SC.evt("welcomeChannelResolved");
client.Evt_writeDataToJSONFile= SC.evt("writeDataToJSONFile");
client.Evt_readDataToJSONFile= SC.evt("readDataToJSONFile");
client.Evt_captureMessage= SC.evt("captureMessage");
client.Samp_acceuilReactionsListing= SC.sampled("acceuilReactionsListing");
client.Samp_fetchMembers= SC.sampled("fetchMembers");
client.Evt_commandListed= SC.evt("commandListed");
client.Evts_Commands= {};
client.zeMac= machine;
global.Evt_clientReset= SC.evt("clientReset");
/*
On crée quelques actions réactives : une action devrait-être exécutée au plus 1
fois par instant.
*/
/*
Cette première commande écrit des fichiers en utilisant l'API synchrone de
node...
Interface :
 - filePath: chemin d'accès au fichier
 - data: objet à transformer en JSON.
*/
client.Act_writeJSONData= function(engine){
    const data= engine.getValuesOf(this.Evt_writeDataToJSONFile);
    for(var cmd of data){
      fs.writeFileSync(cmd.filePath, JSON.stringify(cmd.data));
      }
    };
/*
Inversement cette commande lit des fichiers JSON...
Interface :
 - filePath: chemin d'accès au fichier
 - Evt_response: événement sur lequel diffuser les données.
*/
client.Act_readJSONData= function(engine){
    const data= engine.getValuesOf(this.Evt_readDataToJSONFile);
    for(var cmd of data){
      var obj= JSON.parse(fs.readFileSync(cmd.filePath));
      machine.addEntry(cmd.Evt_response, { name: cmd.filePath, data: obj });
      }
    };
/*
Action activée lorsque le client est près.
*/
client.Act_listCommands= function(engine){
    console.log('Ready!')
    this.CGT_memberList= require('./members.json');
    exec("find ./commands -iname '*.js'",
            (error, stdout, stderr) => {
               var bn= stdout.split(/\s/);
                   bn.pop();
               global.machine.addEntry(client.Evt_commandListed, bn);
            });
    };
client.Act_clientIsReady= function(engine){
  const nl= engine.getValuesOf(this.Evt_commandListed)[0];
  this.NM_Commands= nl;
  exec("git log|grep '^commit'|wc -l",
          (error, stdout, stderr) => {
             var bn= parseInt(stdout);
             client.buildNumber+= (bn>0)?bn:0;
	     client.version+= client.buildNumber-client.baseV;
          });
  this.loadedCommands= [];
  this.user.setStatus("online");
  this.guilds.fetch(CGT.guild_id).then( g => machine.addEntry(this.Evt_guildResolved, g) );
  if(!this._el_registred){
    client.on('reconnecting', () => {
      console.debug('*** Reconnecting! ***');
      });
    client.once('disconnect', () => {
      console.debug('*** Disconnect! ***');
      });
    client.on('invalidated', (err) =>{
      console.error("found a problem");
      console.error(err);
      });
    client.on('error', (err) =>{
      console.error("found a problem");
      console.error(err);
      });
    //client.on('debug', console.log);
    client.on('warn', console.warn);
    this._el_registred= true;
    }
  for(var fnm of this.NM_Commands){
    //console.log("loading", fnm);
    const o=require(fnm);
    if(o.loaded){
      //console.log("already loaded");
      }
    else{
      const prg= o.beh(this);
      engine.addEntry(this.SC_cubeAddBehaviorEvt, prg);
      this.Evts_Commands[o.cmd]= o.evt;
      o.loaded= true;
      }
    this.loadedCommands.push(o);
    //console.log("loading module", o);
    }
  };
client.postReplyMsg= function(p){
  const Evt_postReply= SC.evt("Evt_postReply")
  let pr = SC.cube(p
    , SC.seq(
        SC.action(function(re){
          this.msg.reply(this.txt).then((m => {
            machine.addEntry(Evt_postReply);
            this.rpl= m;
            }).bind(this));
          })
      , SC.await(Evt_postReply)
      , SC.pause(200)
      , SC.action(
          function(re){
            this.rpl.delete();
            this.msg.delete();
            }
          )
        )
      );
  machine.addProgram(pr);  
  };
/*
Quand la guilde (le serveur CGT) est trouvée...
*/
client.Act_fetchingGuild = function(engine){
    const data= engine.getValuesOf(this.Evt_guildResolved);
    if(data){
      const cgt_guild= data[0];
      this.cgt_guild = cgt_guild;
      console.debug("server resolved", cgt_guild.id);
      const chan= cgt_guild.channels.cache.get(CGT.welcome_chan_id);
      if(chan){
        machine.addEntry(this.Evt_welcomeChannelResolved, chan);
        }
      else{
        cgt_guild.channels.fetch(CGT.welcome_chan_id)
                 .then(chan => machine.addEntry(this.Evt_welcomeChannelResolved, chan));
        }
      this.Act_fetchMemebers(engine);
      }
    };
client.Act_fetchMemebers= function(engine){
    const evt_fetchMembers= this.Samp_fetchMembers;
    console.debug("Fecting members....");
    const zc= this;
    this.cgt_guild.members.fetch().then( m => {
        console.debug("Members fetched:", m.size);
        evt_fetchMembers.newValue(m);
      })
    .catch((e) => { console.error("can't fetch members...",e)
                    machine.addEntry(global.Evt_clientReset); })
    this.cgt_guild.channels.fetch().then( m => {
      console.debug("channels fetched:", m.size);
      });
    };
client.Act_welcomeChannelResolved = function(engine){
  let data = engine.getValuesOf(this.Evt_welcomeChannelResolved);
  for(var chan of data){
    console.debug("fetching message in channel", chan.id);
/*
On charge le contenu du message du salon d'accueil => On peut alors voir l'état
des validation de la charte (combien d'utilisateurs sont enregistrés).
*/
    const samp_acceuil= this.Samp_acceuilReactionsListing;
    chan.messages.fetch(CGT.welcome_msg_id).then((m) => {
        let response= m.reactions.cache.get("✅");
        response.users.fetch().then(m =>{
          console.log("message fetched");
          samp_acceuil.newValue(m);
          }
        );
        });
    }
  };
client.Act_acceuil= function(engine){
  const users= engine.sensorValueOf(this.Samp_acceuilReactionsListing);
  const members= engine.sensorValueOf(this.Samp_fetchMembers);
  const stat= this.cgt_server_stats;
  stat.expected= this.CGT_memberList.length;
  stat.num_members= members.size; // form JS std Map object
  console.debug("Users that have validated access");
  for(const user of users.values()){
    const info= this.cgt_getUserInfo(user.id);
    stat.validated++;
    let texte= user.username;
    info.validated= true; 
    if(info){
      texte+= '\t**';
      stat.validated_and_identified++;
      }
    else{
      texte+= '\t'+user.id;
      stat.validated_not_identified++;
      }
    console.debug(texte);
    }
  console.debug("");
  console.debug("*** PROBLEMS: ");
  for(const member of members){
    const mem= member[1];
    if(0==mem._roles.length){
      stat.not_validated++;
      const info= this.cgt_getUserInfo(mem.user.id);      
      if(info){
        console.debug("N\'a pas validé", mem.user.username);
        stat.not_validated_but_known++;
        }
      else{
        console.debug("N\'est pas connu", mem.user.username);
        stat.not_validated_and_unknown++;
        }
      }
    else if(!mem._roles.includes(CGT.role_curieux) && !mem.user.bot){
      stat.validation_problems++;
      console.debug("registration pb", mem.user.username, mem.id);
      for(const r of mem._roles){
        mem.roles.remove(r);
        }
      }
    else{
      const user= mem.user;
      if(user.bot){ continue; }
      const info= this.cgt_getUserInfo(user.id);
      if(undefined==info || !info.validated){
        console.log(((info)?'N\'a pas validé':'N\'est pas connu')+' mais avec des roles:', mem.user.username);
        }
      }
    }
  for(var m of this.CGT_memberList){
    if(""!=m.id){
      stat.identified++;
      }
    else{
      stat.expecting++;
      }
    }
  console.log("stats", stat);
  };
client.dropCommand= function(engine, args){
  const evt_cmd= this.Evts_Commands[args.cmd];
  if(evt_cmd){
    engine.addEntry(evt_cmd, args);
    }
  };

machine.addProgram(
 SC.cubify({
      root: client
    , prg: SC.seq(
             SC.await('Evt_clientReady')
           , SC.resetOn(global.Evt_clientReset
             , SC.cubeAction({ fun: SC.my('Act_listCommands') })
             , SC.await("Evt_commandListed")
             , SC.cubeAction({ fun: SC.my('Act_clientIsReady') })
             , SC.await(SC.my('Evt_guildResolved'))
             , SC.cubeAction({ fun: SC.my('Act_fetchingGuild') })
             , SC.await(SC.my('Evt_welcomeChannelResolved'))
             , SC.cubeAction({ fun: SC.my('Act_welcomeChannelResolved') })
             , SC.par(
                 SC.await(SC.my('Samp_acceuilReactionsListing'))
               , SC.await(SC.my('Samp_fetchMembers'))
                 )
             , SC.cubeAction({
                 fun: SC.my('Act_acceuil')
                 })
/*
 * Start of the client services...
 */
             , SC.repeatForever(
                 SC.await(SC.my('Evt_captureMessage'))
               , SC.cubeAction({
                   fun: SC.my('Act_captureMessage')
                   })
                 )
               )
             )
      })
  );

machine.pollFilters = [];

client.jfs_get_user = function(params){
  if(params){
    this.fetchUser(params.id).then(user => {
               // Got the user!
               message.channel.send('Found user: ' + user.tag
              + '\nAvatar: ' + user.displayAvatarURL);
            }).catch(() => {
              // User not found
              message.channel.send('Could not find user with the given ID.');
            });
    }
  return null;
  };

client.Act_captureMessage= function(re){
    const data= re.getValuesOf(this.Evt_captureMessage);
    if(data){
      const msg= data[0];
      if(('GUILD_TEXT'!=msg.channel.type)
         || msg.author.bot
         || ('!'!=msg.content.charAt(0))
         ){
        return;
        }
      let author_membership= msg.guild.members.cache.get(msg.author.id);
      let author_roles= author_membership.roles;
      let args= msg.content.substring(1).match(/\b\w+\b|(?:"((?:[^\\]|\\\.)*?)")|([0-9]+)|=/g);
      console.log("parsed command:", args);
      this.dropCommand(re, {
        cmd: args[0]
      , args: args
      , am: author_membership
      , ar: author_roles
      , m: msg
        });
      }
    };

console.log('Starting...');
/*
Mise en place des handlers principaux.
*/
let messageCapt= (msg) => {
  machine.addEntry(client.Evt_captureMessage, msg);
  }
//client.on('message', messageCapt); // old version ???
client.once('ready', () => {
    machine.addEntry(client.Evt_clientReady);
    console.log("client is Ready?")
    }
  );
client.on('messageCreate', messageCapt);
//client.on('invalidated', ()=> {process.exit(0);});
client.on('messageReactionAdd', (reaction, user) => {
  const chanId= reaction.message.channel.id;
  const msgId= reaction.message.id;
  //console.log("got reaction", reaction);
  if((chanId===CGT.welcome_chan_id)
      &&(msgId===CGT.welcome_msg_id)){
    //console.log("-", reaction.message.guild);
    reaction.message.guild.members.fetch(user.id).then( member => {
          const info= client.cgt_getUserInfo(user.id);
          reaction.message.guild.roles.fetch(CGT.role_curieux).then( role => {//Curieux
              console.log('user '+user.username+" accepted the rules !");
              member.roles.add(role);
              });
          if(info){
            if(info.syndique){
              reaction.message.guild.roles.fetch(CGT.role_syndique).then( role => {//Syndiqué
                  member.roles.add(role);
                  });
              }
            if(info.elu){
              reaction.message.guild.roles.fetch(CGT.role_elu).then( role => {//Élu
                  member.roles.add(role);
                  });
              }
            if(info.CE){
              reaction.message.guild.roles.fetch(CGT.role_CE).then( role => {//CE
                  member.roles.add(role);
                  });
              }
            if(info.bureau){
              reaction.message.guild.roles.fetch(CGT.role_bureau).then( role => {//Bureau
                  member.roles.add(role);
                  });
              }
            if(info.animateur){
              reaction.message.guild.roles.fetch(CGT.role_animateur).then( role => {//Animateur
                  member.roles.add(role);
                  });
              }
            }
          });
    }
  else{
    for(var filter of machine.pollFilters){
      if((chanId === filter.chanId)
      && (msgId === filter.msgId)
      && (user.id !== client.user.id)
          ){

        machine.addEntry(filter.evt, {reaction: reaction, user: user});
        }
      }
    }
  });
client.on('messageReactionRemove', (reaction, user) => {
  const chanId = reaction.message.channel.id;
  const msgId = reaction.message.id;
  if((chanId === CGT.welcome_chan_id)
      &&(msgId === CGT.welcome_msg_id)
      ){
    reaction.message.guild.members.fetch(user.id).then( member => {
          for(const r of member._roles){
            member.roles.remove(r);
            }
          });
    }
  });



client.login(token).catch((err)=> console.log);

const period= SC.periodic({ delay: 100 });
machine.bindTo(period);
client._sc_lastWill= function(re){
    console.log("terminates");
    machine.disconnectFrom(period);
    process.exit(0);
    };
//global._sc_cgt_inspect(client);

//machine.addProgram(
//  SC.repeatForever(
//    SC.trace("**")
//  , SC.pause(50)
//    )
//  );
