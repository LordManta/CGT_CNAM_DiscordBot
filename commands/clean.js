const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Command_clean");
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
        if(author_roles.cache.get(CGT.role_animateur)){
          if(args.length<1
             || isNaN(parseInt(args[1]))
             || parseInt(args[1])<=0
             ){
            msg.reply("```Usage : clean *nb*\nwhere nb is the number of messages to delete : "+args[1]+"```");
            break;
            }
          msg.channel.bulkDelete(args[1]);
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
  cmd: "clean"
, evt: Evt_cmd
, role: CGT.role_animateur
, help: "*n* : permet à ceux qui ont le rôle @animateur de réaliser une destruction groupée de messages dans le salon courrant. Il s'agit des n derniers messages, avec n entier positif, qui est le nombre de messages à détruire dans le salon."
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
