const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Evt_Command_check");
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
        if(author_roles.cache.get(CGT.role_animateur)){
          let members= engine.sensorValueOf(client.Samp_fetchMembers);
          let response= "";
          let num= 0;
          for(const member of members){
            const mem= member[1];
            if(0 == mem._roles.length){
              response+= "- non validé: "+mem.user.username+" id: "+mem.id+'\n';
              num++;
              }
            else{
              if(!mem._roles.includes(CGT.role_curieux) && ! mem.user.bot){
                num++;
                response+= "- enregistrement inconsistant: "+mem.user.username+" id: "+mem.id+'\r\n';
                //inspect(mem.roles);
                for(const r of mem._roles){
                  mem.roles.remove(r);
                  }
                }
              }
            }
          if(num>1){
            response= `Les utilisateurs suivants ne sont pas correctement enregistrés :\n`+response;
            }
          else if(1==num){
            response= `L'utilisateur suivant n'est pas correctement enregistré :\n`+response;
            }
          else{
            response= `Rien à signaler.`;
            }
          msg.reply(response);
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
    cmd: "check"
  , role: CGT.role_animateur
  , evt: Evt_cmd
  , help: "*subcommand* : lance une vérification d'intégrité du serveur sur une sous commande :\n   - roles : lance un audit des rôles."
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
