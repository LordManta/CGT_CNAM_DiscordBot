const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Command_help");
const Evt_notAuthorized= SC.evt("notAuthorized");

function CommandManager(){
  this.client= null;
  this.timeOutStack= [];
  };

CommandManager.prototype.action= function(engine){
    const data= engine.getValuesOf(Evt_cmd);
    if(data){
      for(var arg of data){
        const msg=arg.m;
        const author_roles=arg.ar;
        const args=arg.args;
        const client=this.client;
        let zeHelpTxt="```"+`md
Help commands :`;
        for(const cmd of client.loadedCommands){
          if(cmd.role && !author_roles.resolve(cmd.role)){
            continue;
            }
          zeHelpTxt+=`
 - `;
          if(cmd.role){
            zeHelpTxt+=`**`
            }
          zeHelpTxt+= cmd.cmd;
          if(cmd.role){
            zeHelpTxt+=`**`
            }
          zeHelpTxt+= " "+cmd.help;
          }
        zeHelpTxt+= "```";
        msg.reply(zeHelpTxt);
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

module.exports={
  cmd: "help"
, evt: Evt_cmd
, help: ": affiche ce message d'aide."
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
