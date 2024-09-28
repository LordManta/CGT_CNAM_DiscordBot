const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Evt_Command_dif");
const Evt_notAuthorized= SC.evt("notAuthorized");

function CommandManager(){
  this.client= null;
  this.timeOutStack= [];
  };

CommandManager.prototype.action= function(engine){
    const data= engine.getValuesOf(Evt_cmd);
    if(data){
      for(var arg of data){
        const msg= arg.m;
        const author_roles= arg.ar;
        const args= arg.args;
        const client= this.client;
        const channel= msg.channel;
        const category= channel.parent;
/*
On ommence par vérifier le rôle
*/
        if(author_roles.cache.get(CGT.role_syndique)){
          if(args.length < 2){
            client.postReplyMsg({ txt: "```Erreur : Il faut au moins le premier argument (url de la diffusion)```\n * Ce message s'autodétruira dans 20s ! *"
                , msg: msg
                });
            continue;
            }
          //let channel = msg.channel;
          //let category = channel.parent;
          console.log("Found channel", channel.id, "and category", category.name);
/*
Si pas de categorie englobante...
*/
          let difChannel = null;
          let difChannelId = null;
          if(args[2]){
            const cat_name= args[2].substr(1, args[2].length-2);
            console.error("Looking for", cat_name);
            category = msg.guild.channels.cache.find(channel => channel.type == "GUILD_CATEGORY" && channel.name == cat_name);	
            console.error("Looking for", category);
            }
          else{
            if(undefined == category){
              continue;
              }
            }
          for(const chan of category.children){
            //console.log("votes",  chan[1].name);
            if(chan[1].name == "annonces"){
              difChannel = chan[1];
              difChannelId = chan[0];
              break; // On a trouvé le salon correspondant c'est ok...
              }
            }
          if(difChannel){
            msg.delete().then(() => {
              difChannel.send(args[1].substr(1, args[1].length-2));
              });
            }
          else{
            msg.reply("Impossible de trouver le  salon #annonces correspondant.");
            }
          }
        else{
          msg.reply("```Unauthorized action !```")
             .then( function(m){ global.machine.addEntry(Evt_notAuthorized, [ m, this ] )}.bind(msg) );
          }
        }
      }
    };
CommandManager.prototype.collectTimeoutMsg= function(re){
    const data= re.getValuesOf(Evt_notAuthorized);
    this.timeOutStack.push(data);
    re.addEntry(this.SC_cubeAddBehaviorEvt, SC.seq(SC.pause(50), SC.action("clearTimeoutMsg")));
    };
 CommandManager.prototype.clearTimeoutMsg= function(re){
    const data= this.timeOutStack.shift();
    for(var msgs of data){
      for(var m of msgs){
        m.delete({ timeout: 5000 });
        }
      }
    };
CommandManager.prototype._sc_lastWill= function(re){
    while(this.timeOutStack.length>0){
      const data= this.timeOutStack.pop();
      for(var msgs of data){
        for(var m of msgs){
          m.delete();
          }
        }
      }
    };

module.exports= {
  cmd: "dif"
, role: CGT.role_syndique
, evt: Evt_cmd
, help: "*url* *catégorie* : diffuse une url dans le canal #annonces de la catégorie."
, beh: function(tgt){
      const cm= new CommandManager();
      cm.client= tgt;
      return SC.resetOn(global.Evt_clientReset
        , SC.cube(cm
          , SC.par(
	      SC.trace(this.cmd+" loaded.")
            , SC.actionOn({ config: Evt_cmd, fun: "action", times: SC.forever })
            , SC.actionOn({ config: Evt_notAuthorized, fun: "collectTimeoutMsg", times: SC.forever })
              )
            )
          );
      }
  };
