const { CGT } = require('../CGT_settings');
const { token }= require('../settings');

const Evt_cmd= SC.evt("Evt_Command_restart");
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
          const Evt_step= SC.evt("step");
          engine.addEntry(this.SC_cubeAddBehaviorEvt,
            SC.seq(SC.await(Evt_step)
            , SC.action("restartAfterDestruction")
            , SC.pause(10)
	    , SC.trace("will send Evt_clientReset")
            , SC.pause()
	    , SC.trace("send Evt_clientReset")
            , SC.generate(global.Evt_clientReset)));
          msg.channel.send('Implementation broken...').then( (m) => {
            global.machine.addEntry(Evt_step);
            });
          }
        else{
          msg.reply("```Unauthorized action !```")
             .then( function(m){ global.machine.addEntry(Evt_notAuthorized, [ m, this ] )}.bind(msg) );
          }
        }
      }
    };
CommandManager.prototype.restartAfterDestruction= function(re){
    console.warn("restart");
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
  cmd: "restart"
, evt: Evt_cmd
, role: CGT.role_animateur
, help: ": redémarre l'exécution du bot"
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
