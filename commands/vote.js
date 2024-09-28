const { Client, Collection , MessageEmbed, Intents} = require('discord.js');
const { performance } = require('perf_hooks');
const { token } = require('../settings');
const { CGT } = require('../CGT_settings');

const Evt_cmd= SC.evt("Evt_Command_halt");
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
        const machine= client.zeMac;  
        if(undefined == author_roles.cache.get(CGT.role_animateur)){
          this.client.postReplyMsg({ txt: "```Erreur : Vous n'avez pas le rôle nécessaire pour lancer cette consultation```\n * Ce message s'autodétruira dans 20s ! *"
              , msg: msg
              });
          continue;
          }
        if(args.length < 3){
          this.client.postReplyMsg({ txt: "```Erreur : Il faut au moins les 2 premiers arguments (type de vote et objet du vote)```\n * Ce message s'autodétruira dans 20s ! *"
              , msg: msg
              });
          continue;
          }
        let channel = msg.channel;
        let category = channel.parent;
        console.log("channel", channel.id, "category", category.name);
        if(undefined == category){
          continue;
          }
        var pollsChannel = null;
        var pollsChannelId = null;
        for(chan of category.children){
          //console.log("votes",  chan[1].name);
          if(chan[1].name == "votes"){
            pollsChannel = chan[1];
            pollsChannelId = chan[0];
            break; // On a trouvé le salon correspondant c'est ok...
            }
          }
        if(null == pollsChannel){
          this.client.postReplyMsg({ txt: "```Erreur : Le salon votes n'existe pas dans la catégorie courante... Impossible de créer une consultation.```\n * Ce message s'autodétruira dans 20s ! *"
              , msg: msg
              });
          continue;
          }
        msg.delete();
        const pollEmbed = new MessageEmbed();
        var optionsDesc = "";
        let allOptions = [[
            {emoji:"👍", meaning: "valider la proposition"}
          , {emoji:"👎", meaning: "invalider la proposition"}
          , {emoji:"😶", meaning: "pas d'avis sur la proposition"}
          , {emoji:"☠️", meaning: "illégitimité du vote"}
            ]
        , [
            {emoji:"✅", meaning: "je peux participer"}
          , {emoji:"❌", meaning: "je ne peux pas participer"}
          , {emoji:"🛑", meaning: "je suis opposé à cette action"}
            ]
          ];
        var options = "";
        var listEm = [];
        switch(args[1]){
          case "2":
          case "prop":{
            options = [];
            break;
            }
          case "1":
          case "part":{
            options = allOptions[1];
            break;
            }
          case "0":
          case "vote":{
            options = allOptions[0];
            break;
            }
          }
        for(var opt of options){
          optionsDesc += " - "+opt.emoji+" : "+opt.meaning+"\n";
          listEm.push(opt.emoji);
          }
        var timeLaps = (args[3])?(parseInt(args[3])/10):30;
        const pollSubject = args[2].replace(/^"|"$/g,"");
        const quorum = (args[4])?parseInt(args[4]):0
        timeLaps = (timeLaps < 3)?3:timeLaps;
        pollEmbed.setColor(0xFFC300)
                 .setTitle('Délibération')
                 .setDescription(pollSubject+"\n\n*termine dans "
                               + (timeLaps*10) + " s*")
                 .setFooter({ text: optionsDesc });
        const Evt_voteCheck = SC.evt("Evt_voteCheck");
        pollsChannel.send({ embeds: [ pollEmbed ] })
                                            .then( m => {
            machine.addToOwnProgram(
              SC.cubify({
                root: {
                  m: m
                , timeLaps: timeLaps
                , votes: {}
                , quorum: quorum
                , Act_lastUpdate: function(){
                     const embed = this.m.embeds[0];
                     //console.log(">< reactions: ", this.m.reactions);
                     var exprims = 0;
                     for(var opt of options){
                       let item = this.m.reactions.resolve(opt.emoji);
                       console.log('for', opt.emoji/*, " item: ", item*/);
                       if(item.count>1){
                         exprims += (item.count-1);
                         embed.addField(""+opt.emoji, ''+(item.count-1));
                         }
                       }
                     if(this.quorum > 0 && exprims < this.quorum){
                       embed.setDescription(pollSubject
                                         +"\n\n*le quorum n'a pas été atteint*");
                       }
                     else{
                       embed.setDescription(pollSubject
                                         +"\n\n*est maintenant terminé*");
                       }
                     embed.setFooter({ text: "" });
                     this.m.edit({ embeds: [ new MessageEmbed(embed) ] });
                     this.m.reactions.removeAll();
                     }
                , Act_update: function(){
                     const embed = this.m.embeds[0];
                     embed.setDescription(args[2]
                                  .replace(/^"|"$/g,"")
                                  +"\n\n*termine dans "
                                  +((--this.timeLaps)*10)+'s*');
                     //console.log("updating...", embed);
                     this.m.edit({ embeds: [ new MessageEmbed(embed) ] });
                     }
                , voteCheckAction: function(engine){
                      let vals = engine.getValuesOf(Evt_voteCheck);
                      for(var vote of vals){
                        if(this.votes[vote.user.id]){
                          console.log("has already vote");
                          const oldVote = this.votes[vote.user.id];
                          const item = this.m.reactions.resolve(
                                                      oldVote.reaction.emoji.name);
                          console.log('from ', oldVote.reaction.emoji.name
                                      , ' to ', vote.reaction.emoji.name
                                      /*, ' got ', item*/);
                          item.users.remove(oldVote.user);
                          }
                        this.votes[vote.user.id] = vote;
                        }
                      }
                  }
              , life: {
                  lastWill: function(){ }
                  }
              , prg: SC.par(
                        SC.seq(
                          SC.repeat(timeLaps
                          , SC.pause(100)
                          , SC.cubeAction({ fun: SC.my("Act_update") })
                            )
                        , SC.killSelf()
                        , SC.cubeAction({ fun: SC.my("Act_lastUpdate") })
                          )
                      , SC.repeatForever(
                          SC.await(Evt_voteCheck)
                        , SC.cubeAction({fun: SC.my("voteCheckAction") })
                          )
                        )
                })
               );
            machine.pollFilters.push({msgId: m.id, chanId: m.channel.id, evt: Evt_voteCheck});
            switch(args[1]){
              case "0":
              case "vote":{
/*
Il faudrait s'assurer que les réactions sont postées dans le bon ordre.
*/
                for(var opt of options){
                  m.react(opt.emoji);
                  }
                break;
                }
              }
            })
           .catch((error) => console.error );
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
  cmd: "vote"
, role: CGT.role_animateur
, evt: Evt_cmd
, help: "vote *type* *objet* *temps* *quorum* *options* : construit une nouvelle délibération dans le cana «votes» de la catégorie courante si ce canal existe et que vous en avez l'autorisation"
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
