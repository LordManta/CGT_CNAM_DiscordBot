const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Evt_Command_info");
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
        if(author_roles.cache.get(CGT.role_syndique)){
          const users= engine.sensorValueOf(client.Samp_acceuilReactionsListing);
          const members= engine.sensorValueOf(client.Samp_fetchMembers);
          let response= "";
          const stat= client.cgt_server_stats;
          stat.reset();
          stat.expected= client.CGT_memberList.length;
          stat.num_members= members.size; // form JS std Map object
          let unknown_but_validated= [];
          let known_but_not_validated= [];
          let known_validated_but_no_role= [];
          let not_syndicated= [];
          for(const user of users.values()){
            const info= client.cgt_getUserInfo(user.id);
            stat.validated++;
            info.validated= true; 
            if(info){
              stat.validated_and_identified++;
              }
            else{
              unknown_but_validated.push({ id: user.id, name: user.username });
              stat.validated_not_identified++;
              }
            }
          for(const member of members){
            const mem= member[1];
            const info= client.cgt_getUserInfo(mem.user.id);      
            if(info && info.syndique){
              stat.syndicated++;
              }
            else{
              if(!mem.user.bot && info){
                not_syndicated.push({ id: mem.user.id, name: mem.user.username, known_name: info.name});
                }
              }
            if(0==mem._roles.length){
              stat.has_no_roles++;
              if(info){
                if(!info.validated){
                  known_but_not_validated.push({ id: mem.user.id, name: mem.user.username, known_name: info.name });
                  stat.not_validated++;
                  stat.not_validated_but_known++;
                  }
                else{
                  known_validated_but_no_role.push({ id: mem.user.id, name: mem.user.username, known_name: info.name });
                  }
                }
              }
            else if(!mem._roles.includes(CGT.role_curieux) && !mem.user.bot){
              stat.validation_problems++;
              if(info && info.validated){
                //mem.roles.add(CGT.role_curieux);
                }
              else{
                //stat.validation_problems++;
                //for(const r of mem._roles){
                //  mem.roles.remove(r);
                //  }
                }
              }
            else{
              const user= mem.user;
              if(user.bot){ continue; }
              if(info){
                if(! info.validated){
                  known_but_not_validated.push({ id: mem.user.id, name: mem.user.username });
                  stat.not_validated_but_known++;
                  // should remove roles Fabriiiice !!!!!!
                  //for(const r of mem._roles){
                  //  mem.roles.remove(r);
                  //  }
                  }
                }
              else{
                //for(const r of mem._roles){
                //  mem.roles.remove(r);
                //  }
                }
              }
            }
          response+= `Nous sommes actuellement ${stat.num_members} membre${stat.num_members>1?'s':''} sur ce serveur dont 1 robot\n`;
          response+= `Nous sommes ${stat.syndicated} syndiqués\n`;
          if(author_roles.cache.get(CGT.role_animateur)){
            if(not_syndicated.length>0){
              response+= (1==not_syndicated.length)?`Le non syndiqué est :\n`
                                                   :`Les ${not_syndicated.length} non syndiqués sont :\n`;
              for(var u of not_syndicated){
                response+= '- '+u.name+' ('+u.id+') :\t '+u.known_name+'\n';
                }
              }
            if((stat.num_members-1-not_syndicated.length)>0){
              response+= `Les autres comptes sont des comptes dupliqués qui ne sont pas supprimés et servent à des expérimentations.\n\n`;
              }
            if(stat.not_validated_but_known>0 || known_validated_but_no_role.length>0){
              response+= (stat.not_validated_but_known>1)
                           ?`Les utilisateurs suivants ne sont pas correctement enregistrés :\n`
                           :((1==stat.not_validated_but_known)?`L'utilisateur suivant n'est pas correctement enregistré :\n`:'');
              for(var u of known_but_not_validated){
                response+= '- '+u.name+' ('+u.id+') :\t '+u.known_name+'\n';
                }
              response+= (known_validated_but_no_role.length>1)
                           ?`Les utilisateurs suivants sont enregistrés mais n'ont pas de rôle:\n`
                           :((1==known_validated_but_no_role.length)?`L'utilisateur suivant est enregistré mais n'a pas de rôle :\n`:'');
              for(var u of known_validated_but_no_role){
                response+= '- '+u.name+' ('+u.id+') :\t '+u.known_name+'\n';
                }
              }
            }
          msg.reply(response);
          }
        else{
          msg.reply("```Action non autorisée !```")
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
  cmd: "info"
, role: CGT.role_syndique
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

