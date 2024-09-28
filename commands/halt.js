const { CGT } = require('../CGT_settings');

const EMOJI_OK= '👍';
const EMOJI_KO= '👎';
const Evt_cmd= SC.evt("command_halt");
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
          const Evt_step1= SC.evt('setp1')
          const Evt_error= SC.evt("error");
          const Evt_timeout= SC.evt("timeout");
          const Evt_col= SC.evt('col');
          const steps= { st1: Evt_step1
                       , err: Evt_error
                       , msg: msg
                       , to: Evt_timeout
                       , col: Evt_col
                         };
          engine.addEntry(this.SC_cubeAddBehaviorEvt
          , SC.kill(Evt_error
            , SC.seq(
                SC.await(Evt_step1)
              , SC.action(this.setReactions.bind(this, steps))
              , SC.await(Evt_col)
              , SC.action(this.checkCollection.bind(this, steps))
                )
              )
            );
          const res= msg.channel.send('Shutting down ?')
            .then(function(m){ global.machine.addEntry(this, m); }.bind(Evt_step1))
            .catch(function(m){ global.machine.addEntry(this, m); }.bind(Evt_error) );
          }
        else{
          msg.reply("```Unauthorized action !```")
             .then( function(m){ global.machine.addEntry(Evt_notAuthorized, [ m, this ] )}.bind(msg) );
          }
        }
      }
    };
CommandManager.prototype.setReactions= function(steps, re){
    const data= re.getValuesOf(steps.st1);
    const m= data[0];
    m.react(EMOJI_OK).then( () => m.react(EMOJI_KO));
    steps.m= m;
    m.awaitReactions({ filter: function(steps, reaction, user){
                       return user.id==steps.msg.author.id
                              && (EMOJI_OK==reaction.emoji.name
                               || EMOJI_KO==reaction.emoji.name) ; }.bind(this, steps)
                     , max: 1, time: 30000 })
                              .then(function(collected){
                                      this.collected= collected;
                                      global.machine.addEntry(this.col, collected); }.bind(steps))
                              .catch(this.collectionError.bind(this, steps));
    };
CommandManager.prototype.collectionError= function(steps, err){
    global.machine.addEntry(steps.err);
    steps.msg.reply('Operation canceled').then(function(steps, tmp){
      const m= steps.m;
      const msg= steps.msg;
      tmp.delete({ timeout: 5000 }).then( () => {
          m.delete().then( () => {
              msg.delete();
              });
          });
      }.bind(this, steps));
    };
CommandManager.prototype.checkCollection= function(steps, re){
    const data= re.getValuesOf(steps.col);
    const collected= data[0];
    const msg= steps.msg;
    const m= steps.m;
    const client= this.client;
    console.log("a reaction occurs", collected.first().emoji.name);
    if(EMOJI_OK==collected.first().emoji.name){
      msg.reply('Shutting down...').then( (tmp) =>{
          tmp.delete({timeout:2000}).then( () => {
              m.delete().then( () => {
                  msg.delete().then( () => { client.destroy(); global.machine.addEntry(client.SC_cubeKillEvt); })
                  });
              });
          });
      }
    else{
      msg.reply('Operation canceled.').then((tmp) => {
        tmp.delete({timeout:2000}).then( () => {
            m.delete().then( () => {
                msg.delete();
                });
            });
        });
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
    cmd: "halt"
  , evt: Evt_cmd
  , role: CGT.role_animateur
  , help: ": stoppe l'exécution du bot"
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
