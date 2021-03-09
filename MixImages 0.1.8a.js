// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ----------------------------------------------------------------------------
// MixImages Version 0.1.5 - Released 02.07.21
// ----------------------------------------------------------------------------
//
//
// ****************************************************************************
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ****************************************************************************
// MixImages.js - Released 2021
// ****************************************************************************
//
// This file is part of LinearStarRemoval Script Version 0.1.0
//
// Copyright (C) 2021 Alex Woronow. All Rights Reserved.
//
// Redistribution and use in both source and binary forms, with or without
// modification, is permitted provided that the following conditions are met:
//
// 1. All redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. All redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// 3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
//    of their contributors, may be used to endorse or promote products derived
//    from this software without specific prior written permission. For written
//    permission, please contact info@pixinsight.com.
//
// 4. All products derived from this software, in any form whatsoever, must
//    reproduce the following acknowledgment in the end-user documentation
//    and/or other materials provided with the product:
//
//    "This product is based on software from the PixInsight project, developed
//    by Pleiades Astrophoto and its contributors (http://pixinsight.com/)."
//
//    Alternatively, if that is where third-party acknowledgments normally
//    appear, this acknowledgment must be reproduced in the product itself.
//
// THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
// INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
// DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
// ****************************************************************************

/*
 * BUG REPORTING
 * Please send information on bugs to Alex@FaintLightPhotography.com. Include
 * the version number of the script you are reporting as well as relevant
 * parts of the Process Console output and other outputs/messages.
*/

#feature-id    Utilities > Mix/Restar

#feature-info  Mix two image in a proprotion that varies by relative image intensities.

#include <pjsr/ColorSpace.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Color.jsh>

#define VERSION "0.1.5"

// define a global variable containing script's parameters
var MixImages = {
   KTarget: 1.0,
   KSource: 1.0,
   TargetImage: undefined,
   SourceImage: undefined,
   Mask: undefined,
   EquationNo: 0,
   MixImage: "",
   Iterate: true,
   InvertMask: false,
   RescaleResult: true,

   save: function () {

         Parameters.set( "KTarget", MixImages.KTarget );
         Parameters.set( "KSource", MixImages.KSource );
         Parameters.set( "TargetImage", MixImages.TargetImage.id );
         Parameters.set( "SourceImage", MixImages.SourceImage.id );
         Parameters.set( "Mask", MixImages.Mask.id );
         Parameters.set( "EquationNo", MixImages.EquationNo );
         Parameters.set( "InvertMask", MixImages.InvertMask );
         Parameters.set( "RescaleResult", MixImages.RescaleResult );
   },

   // load the script instance parameters
   load: function() {

      if (Parameters.has("KTarget")) {
         MixImages.KTarget = Parameters.getReal("KTarget") }
      if (Parameters.has("KSource")) {
         MixImages.KSource = Parameters.getReal("KSource") }
      if (Parameters.has("TargetImage")) {
         MixImages.TargetImage = View.viewById(Parameters.getString("TargetImage")) }
      if (Parameters.has("SourceImage")) {
         MixImages.SourceImage = View.viewById(Parameters.getString("SourceImage")) }
      if (Parameters.has("Mask")) {
         MixImages.Mask = View.viewById(Parameters.getString("Mask")) }
      if (Parameters.has("EquationNo")) {
         MixImages.EquationNo = Parameters.getInteger("EquationNo") }
      if (Parameters.has("InvertMask")) {
         MixImages.InvertMask = Parameters.getBoolean("InvertMask") }
      if (Parameters.has("RescaleResult")) {
         MixImages.RescaleResult = Parameters.getBoolean("RescaleResult") }
   }
};

//------------------------------------------------------------------------------
// Construct the script dialog interface
//------------------------------------------------------------------------------
function parametersDialogPrototype() {

   this.__base__ = Dialog;
   this.__base__();

   this.windowTitle = "ImageMix (v"+VERSION+")";

   Console.show();

   // create a title area
   this.title = new TextBox(this);
   this.title.text = "<b>ImageMix</b><br><br>This script mixes two images" +
                     " according to a user-selected equation." +
                     " Five equations are available. In three of them," +
                     " the mixing is through a mask. The meaning of the" +
                     " weights varies by equation." +
                     " It mixes mask-conceled and Mask-revealed image components." +
                     " with independent mixing coeficients." +
                     "  A principal use of this script is to transfer stars" +
                     " into a starless image (or replace the stars in an image." +
                     " <p>       --Alex Woronow (v"+VERSION+") -- 3/2021--";
   this.title.readOnly = true;
   this.title.backroundColor = 0x333333ff;
   this.title.minHeight = 130;
   this.title.maxHeight = 130;


   // EquationNo pickers radiobuttons.
   //
   this.Eq0rb = new RadioButton(this);
   this.Eq0rb.text = "#0: Use Simple Equation: ( K*Image_1 + ~K*Image_2 )";
   this.Eq0rb.checked = MixImages.EquationNo === 0;
   this.Eq0rb.enabled = true;
   this.Eq0rb.onClick = function (checked) {
      if( this.dialog.Eq0rb.checked ) {
         MixImages.EquationNo = "0";
         Console.writeln (" Selected Equation #",MixImages.EquationNo);
         this.dialog.update();
      }
   }

   this.Eq1rb = new RadioButton(this);
   this.Eq1rb.text = "#1: Use Equation: max( KTarget*Target, Mask*KSource*Source )";
   this.Eq1rb.checked = MixImages.EquationNo === 1;
   this.Eq1rb.enabled = true;
   this.Eq1rb.onClick = function (checked) {
      if( this.dialog.Eq1rb.checked ) {
         MixImages.EquationNo = "1";
         Console.writeln (" Selected Equation #",MixImages.EquationNo);
         this.dialog.update();
      }
   }

   this.Eq2rb = new RadioButton(this);
   this.Eq2rb.text = "#2: Use EquationNo: ( ~Mask*KTarget*Target + Mask*KSource*Source )";
   this.Eq2rb.checked = MixImages.EquationNo === 2;
   this.Eq2rb.enabled = true;
   this.Eq2rb.onClick = function (checked) {
      if( this.dialog.Eq2rb.checked ) {
         MixImages.EquationNo = 2;
         Console.writeln (" Selected Equation #",MixImages.EquationNo);
         this.dialog.update();
      }
   }

   this.Eq3rb = new RadioButton(this);
   this.Eq3rb.text = "#3: Use Equation: max( KTarget*Target, KSource*Source )";
   this.Eq3rb.checked = MixImages.EquationNo === 3;
   this.Eq3rb.enabled = true;
   this.Eq3rb.onClick = function (checked) {
      if( this.dialog.Eq3rb.checked ) {
         MixImages.EquationNo = "3";
         Console.writeln (" Selected Equation #",MixImages.EquationNo);
         this.dialog.update();
      }
   }

   this.Eq4rb = new RadioButton(this);
   this.Eq4rb.text = "#4: Use Equation: Mask*(K1*Revealed_Im +~K1*Concealed_Im) + ~Mask*(~K2+*Revealed_Im+K2*Concealed_Im)";
   this.Eq4rb.checked = MixImages.EquationNo === 4;
   this.Eq4rb.enabled = true;
   this.Eq4rb.onClick = function (checked) {
      if( this.dialog.Eq4rb.checked ) {
         MixImages.EquationNo = "4";
         Console.writeln (" Selected Equation #",MixImages.EquationNo);
         this.dialog.update();
      }
   }

   this.RBSizer = new VerticalSizer;
   this.RBSizer.scaledMargin = 20;
   this.RBSizer.spacing = 8;
   this.RBSizer.add(this.Eq0rb)
   this.RBSizer.add(this.Eq1rb)
   this.RBSizer.add(this.Eq2rb)
   this.RBSizer.add(this.Eq3rb)
   this.RBSizer.add(this.Eq4rb)

   // Image Pickers
   //
   // add Target View picker
   this.TIViewList = new ViewList(this);
   this.TIViewList.scaledMaxWidth = 200;
   this.TIViewList.getMainViews();
   if (MixImages.TargetImage) {
      this.TIViewList.currentView = MixImages.TargetImage;
   }
   MixImages.TargetImage = this.TIViewList.currentView;
   this.TIViewList.toolTip = "<p>Select the Target image.</p>";
   this.TIViewList.onViewSelected = function (View) {
      MixImages.TargetImage = View;
   }

   // add Source picker
   this.SIViewList = new ViewList(this);
   this.SIViewList.scaledMaxWidth = 200;
   this.SIViewList.getMainViews();
   if (MixImages.SourceImage) {
      this.SIViewList.currentView = MixImages.SourceImage;
   };
   MixImages.SourceImage = this.SIViewList.currentView;
   this.SIViewList.toolTip = "<p>Select a Source image to mix with the target image.</p>";
   this.SIViewList.onViewSelected = function (View) {
      MixImages.SourceImage = View;
   }

   // add Mask picker
   this.MIViewList = new ViewList(this);
   this.MIViewList.scaledMaxWidth = 200;
   this.MIViewList.getMainViews();
   if (MixImages.Mask) {
      this.MIViewList.currentView = MixImages.Mask;
   };
   MixImages.Mask = this.MIViewList.currentView;
   this.MIViewList.toolTip = "<p>Select a Masking Image (Optinal).</p>";
   this.MIViewList.onViewSelected = function (View) {
      MixImages.Mask = View;
   }

   // Label for Target picker
   this.TILabel = new Label(this);
      this.TILabel.margin = 0;
      this.TILabel.text = "Target Image:";
      this.TILabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // Label for Source picker
   this.SILabel = new Label(this);
      this.SILabel.lmargin = 0;
      this.SILabel.text = "Source Image:";
      this.SILabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // Label for Mask picker
   this.MLabel = new Label(this);
      this.MLabel.margin = 0;
      this.MLabel.text = "Mask:";
      this.MLabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // blank string
   this.blank = new Label(this);
      this.blank.margin = 2;
      this.blank.text = "     ";
      this.blank.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // invert the mask?
   this.InvertMaskcb = new CheckBox(this);
   this.InvertMaskcb.text = "Invert Mask";
   this.InvertMaskcb.checked = MixImages.InvertMask;
   this.InvertMaskcb.toolTip = "Use the inverted mask."
   this.InvertMaskcb.enabled = true;
   this.InvertMaskcb.onClick = function() {
      MixImages.InvertMask = !MixImages.InvertMask;
   }

   this.V1Sizer = new VerticalSizer;
   this.V1Sizer.spacing = 2;
   this.V1Sizer.add(this.TILabel);
   this.V1Sizer.add(this.TIViewList);
   this.V1Sizer.spacing = 2;
   this.V1Sizer.add(this.blank);


   this.V2Sizer = new VerticalSizer;
   this.V2Sizer.spacing = 2;
   this.V2Sizer.add(this.SILabel);
   this.V2Sizer.add(this.SIViewList);
   this.V2Sizer.spacing = 8;
   this.V2Sizer.add(this.blank);

   this.V3Sizer = new VerticalSizer;
   this.V2Sizer.spacing = 2;
   this.V3Sizer.add(this.MLabel);
   this.V3Sizer.add(this.MIViewList);
   this.V3Sizer.spacing = 2;
   this.V3Sizer.add(this.InvertMaskcb);

   // arrange image selectors horizontally
   this.SelectViewsSizer = new HorizontalSizer;
   this.SelectViewsSizer.addStretch();
   this.SelectViewsSizer.add(this.V1Sizer)
   this.SelectViewsSizer.addStretch();
   this.SelectViewsSizer.add(this.V2Sizer)
   this.SelectViewsSizer.addStretch();
   this.SelectViewsSizer.add(this.V3Sizer)
   this.SelectViewsSizer.addStretch();

   // SourceImage weigth (or star weight)
   this.SAmountControl = new NumericControl(this);
   this.SAmountControl.slider.scaledMinWidth = 500;
   this.SAmountControl.label.text = "    Source-Image Weight:";
   this.SAmountControl.setRange( 0, 10 );
   this.SAmountControl.slider.setRange( 0, 1000 );
   this.SAmountControl.setPrecision( 2 );
   this.SAmountControl.setValue( MixImages.KSource );
   this.SAmountControl.enabled = true;
   this.SAmountControl.toolTip = "<p>Set the weight  for the image mixed with " +
         "the target image. (E.g., this could be the image with the stars.</p>";
   this.SAmountControl.onValueUpdated = function( value ) {
      MixImages.KSource = value;
   }

   // TargetImage weight (or starless weight)
   this.TAmountControl = new NumericControl(this);
   this.TAmountControl.slider.scaledMinWidth = 500;
   this.TAmountControl.label.text = "      Target-Image Weight:";
   this.TAmountControl.setRange( 0, 10 );
   this.TAmountControl.slider.setRange( 0, 1000 );
   this.TAmountControl.setPrecision( 2 );
   this.TAmountControl.setValue( MixImages.KTarget );
   this.TAmountControl.enabled = true;
   this.TAmountControl.toolTip = "<p>Set weight  for the Target image. (E.g., "+
         "this image could be a starless image.)</p>";
   this.TAmountControl.onValueUpdated = function( value ) {
      MixImages.KTarget = value;
   }

   // Iterate(?) dialog Checkbox
   this.IterateDialog = new CheckBox(this);
   this.IterateDialog.scaledMargin = 20;
   this.IterateDialog.text = " Iterate Dialog    ";
   this.IterateDialog.toolTip = "Check to compute the result then reopen the dialog " +
      "with the last-used values presented."
   this.IterateDialog.checked = MixImages.Iterate;
   this.IterateDialog.enabled = true;
   this.IterateDialog.onClick = function() {
      MixImages.Iterate = !MixImages.Iterate;
   }

   // rescale results [0,1]?
   this.RescaleResultcb = new CheckBox(this);
   this.RescaleResultcb.scaledMargin = 20;
   this.RescaleResultcb.text = "Resdcale Result";
   this.RescaleResultcb.checked = MixImages.RescaleResult;
   this.RescaleResultcb.toolTip = "Check to cause final image to be rescalled [0,1] " +
      "with the last-used values presented."
   this.RescaleResultcb.enabled = true;
   this.RescaleResultcb.onClick = function() {
      MixImages.RescaleResult = !MixImages.RescaleResult;
   }

   this.CbSizer = new HorizontalSizer;
   this.CbSizer.spacing =20;
   this.CbSizer.scaledMargin = 10;
   this.CbSizer.add(this.RescaleResultcb);
   this.CbSizer.add(this.IterateDialog);
   this.CbSizer.addStretch();

   // Buttons
   //
   // instance button
   this.newInstanceButton = new ToolButton( this );
   this.newInstanceButton.icon = this.scaledResource( ":/process-interface/new-instance.png" );
   this.newInstanceButton.setScaledFixedSize( 24, 24 );
   this.newInstanceButton.toolTip = "New Instance";
   this.newInstanceButton.onMousePress = () => {
      MixImages.save();
      this.newInstance();
   };

   // doc button
   this.documentationButton = new ToolButton(this);
   this.documentationButton.icon = this.scaledResource( ":/process-interface/browse-documentation.png" );
   this.documentationButton.toolTip = "<p>See the folder containing this script " +
                                      "for the documentation </p>";

   // cancel button
   this.cancelButton = new PushButton(this);
   this.cancelButton.text = "Exit";
   this.cancelButton.backgroundColor = 0x22ff0000;
   this.cancelButton.textColor = 0xfffffff0;
   this.cancelButton.onClick = function() {
      this.dialog.cancel();
   };
   this.cancelButton.defaultButton = true;
   this.cancelButton.hasFocus = true;

   // execution button
   this.execButton = new PushButton(this);
   this.execButton.text = "RUN";
   this.execButton.toolTip = "Invoke Script on active image.";
   this.execButton.backgroundColor = 0x2200ff00;
   this.execButton.width = 40;
   this.execButton.enabled = true;
   this.execButton.onClick = () => {
      this.ok();
   };

     // create a horizontal sizer to layout the execution-row buttons
   this.execButtonSizer = new HorizontalSizer;
   //this.execButtonSizer.scaledMargin = 20;
   this.execButtonSizer.spacing = 12;
   this.execButtonSizer.add(this.newInstanceButton);
   this.execButtonSizer.add(this.documentationButton);
   this.execButtonSizer.addStretch();
   this.execButtonSizer.add(this.cancelButton);
   this.execButtonSizer.add(this.execButton)

   // final arrangement of controls
   this.sizer = new VerticalSizer;
   this.sizer.scaledMargin = 20;
   this.sizer.scaledSpacing = 6;
   this.sizer.add(this.title);
   this.sizer.addStretch();
   this.sizer.add(this.RBSizer);
   this.sizer.addStretch();
   this.sizer.add(this.SelectViewsSizer);
   this.sizer.add(this.CbSizer)

   this.sizer.addStretch();
   this.sizer.addScaledSpacing(10);
   this.sizer.add(this.TAmountControl);
   this.sizer.add(this.SAmountControl);
   this.sizer.add(this.execButtonSizer);
   this.adjustToContents();

   this.dialog.update();


   //------------------------------------------------------------------------------
   //------------- Change dialog depending of equation selection ------------------
   //------------------------------------------------------------------------------
   this.update = function() {

      this.dialog.Eq0rb.checked = MixImages.EquationNo == 0;
      this.dialog.Eq1rb.checked = MixImages.EquationNo == 1;
      this.dialog.Eq2rb.checked = MixImages.EquationNo == 2;
      this.dialog.Eq3rb.checked = MixImages.EquationNo == 3;
      this.dialog.Eq4rb.checked = MixImages.EquationNo == 4;

      this.dialog.MIViewList.enabled = !this.dialog.Eq3rb.checked && !this.dialog.Eq0rb.checked;
      this.dialog.InvertMaskcb.enabled = !this.dialog.Eq0rb.checked && !this.dialog.Eq3rb.checked;
      this.dialog.SAmountControl.enabled = !this.dialog.Eq0rb.checked;

      if( this.dialog.Eq4rb.checked || this.dialog.Eq0rb.checked ) {  // either selected
         this.dialog.TAmountControl.setRange( 0.00, 1.00 );
         if( MixImages.KTarget >= 1 ) this.dialog.TAmountControl.setValue( MixImages.KTarget );

         if ( this.dialog.Eq0rb.checked ) {
            //MixImages.KTarget = 0.5;
            this.dialog.TAmountControl.setValue( MixImages.KTarget );
            this.dialog.TIViewList.toolTip = "<p>Select the image that receives the weight below" ;
            this.dialog.TILabel.text = "Image_1:";
            this.dialog.SIViewList.toolTip = "<p>Select the image that receieves the ~weigth" ;
            this.dialog.SILabel.text = "Image_2:";
            this.dialog.TAmountControl.label.text = "      Mixing Coefficient:";
            this.dialog.TAmountControl.toolTip = "<p>Set weight  for the first-specified image.</p>";
         } else if( this.dialog.Eq4rb.checked ) {
            this.dialog.TAmountControl.setRange( 0.00, 1.00 );
            this.dialog.SAmountControl.setValue( MixImages.KTarget );
            this.dialog.TIViewList.toolTip = "<p>Select the image that dominantly contributes" +
               " the mask-revealed component to the final image.</p>";
            this.dialog.TILabel.text = "Mask-Revealed Image:";

            this.dialog.SAmountControl.setRange( 0.00, 1.00 );
            this.dialog.SAmountControl.setValue( MixImages.KSource );
            this.dialog.SIViewList.toolTip = "<p>Select the image that dominantly contributes" +
               " the masked-concealed component to the final image.</p>";
            this.dialog.SILabel.text = "Mask-Concealed Image:";

            this.dialog.TAmountControl.label.text = "    K1 Mxing Coef.:";
            this.dialog.TAmountControl.toolTip = "<p>Set the weight blending the mask-revealed areas " +
               "of the Target Image.";

            this.dialog.SAmountControl.label.text = "   K2 Mixing Coef.:";
            this.dialog.SAmountControl.toolTip = "<p>Set the mixing coefficient for mask-Concealed areas" ;
         }
      } else { // selected 1,2, or 3
         this.dialog.TIViewList.toolTip = "<p>Select the TARGET image.</p>";
         this.dialog.TILabel.text = "Target Image:";

         this.dialog.SIViewList.toolTip = "<p>Select a Source image to mix with the target image.</p>";
         this.dialog.SILabel.text = "Source Image:";

         this.dialog.TAmountControl.setRange( 0.00, 10.00 );
         this.dialog.TAmountControl.setValue( MixImages.KTarget );
         this.dialog.TAmountControl.label.text = "      Target-Image Weight:";
         this.dialog.TAmountControl.toolTip = "<p>Set weight  for the Target image. (E.g., "+
            "this image could be a starless image.)</p>";

         this.dialog.SAmountControl.setRange( 0.00, 10.00 );
         this.dialog.SAmountControl.setValue( MixImages.KSource );
         this.dialog.SAmountControl.label.text = "     Source-Image Weight:";
         this.dialog.SAmountControl.toolTip = "<p>Set the mixing coefficient for the mask-concealed areas" ;
      }
   };
};

//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//------------- Pixel Math that does the Mixing --------------------------------
//------------------------------------------------------------------------------
function Mix (outName) {

   let TargetImage = MixImages.TargetImage.id;
   let SourceImage = MixImages.SourceImage.id;
   let Mask;
   if( MixImages.Mask.id == "" ) {
      Mask = 0.50;
   } else {
      Mask = MixImages.InvertMaskcb ? "(~"+MixImages.Mask.id+")" : MixImages.Mask.id;
   }
   let KT = MixImages.KTarget;
   let KS = MixImages.KSource;
   let Eqn = MixImages.EquationNo;
   let EQ;

   if( Eqn === 0 ) {
      EQ = KT+"*"+TargetImage+"+~"+KT+"*"+SourceImage ;
   } else if( Eqn === 1 ) {
      EQ = "max("+KT+"*"+TargetImage+","+KS+"*"+Mask+"*"+SourceImage+")" ;
   } else if( Eqn === 2 ) {
      EQ = "~"+Mask+"*"+KT+"*"+TargetImage+"+"+Mask+"*"+KS+"*"+SourceImage;
   } else if( Eqn === 3 ) {
      EQ = "max("+KS+"*"+SourceImage+","+KT+"*"+TargetImage+")" ;
   } else { //use Eqn 4
      EQ = Mask+"*("+KT+"*"+TargetImage+"+~"+KT+"*"+SourceImage+")+"+
           "~"+Mask+"*(~"+KS+"*"+TargetImage+"+"+KS+"*"+SourceImage+");" ;
   }

  var P = new PixelMath;
      P.expression = "";
      P.expression  = EQ;
      P.symbols = "TargetImage, SourceImage, Mask, KTarget, w, weight, EQn";
      P.expression1 = "";
      P.expression2 = "";
      P.useSingleExpression = true;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = MixImages.RescaleResult;;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = .94;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outName;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.RGB;
      //P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(MixImages.TargetImage); // dummy
		var view = View.viewById(outName);
     	return view;
};

//------------------------------------------------------------------------------
//------------- Report input images and settings -------------------------------
//------------------------------------------------------------------------------
function Show_N_Tell () {

   Console.writeln("\n Target Image: ", MixImages.TargetImage.id);
   Console.writeln(" Source Image: ", MixImages.SourceImage.id);
   if( MixImages.EquationNo !== "3" ) {
      Console.writeln(" Mask: ", MixImages.Mask.id);
   }
   Console.writeln(" Target Weighting Coef: ", MixImages.KTarget);
   Console.writeln(" Source Weighting Coef: ", MixImages.KSource);
   Console.writeln(" Using Equation: #", MixImages.EquationNo);
   Console.writeln(" Rescale Results: ", MixImages.RescaleResult);
   Console.writeln("\n");

   return CheckInputs();
};

//------------------------------------------------------------------------------
//------------------- Check for necessary inputs -------------------------------
//------------------------------------------------------------------------------
function CheckInputs() {

   let HaveT = MixImages.TargetImage.id != "";
   let HaveS = MixImages.SourceImage.id != "";
   if( MixImages.EquationNo === 3 ) return (HaveT && HaveS);
   if( MixImages.EquationNo === 0 ) return (HaveT);
   return ( HaveT && HaveS );
};


//------------------------------------------------------------------------------
parametersDialogPrototype.prototype = new Dialog;
//------------------------------------------------------------------------------


//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function main() {
   Console.abortEnabled = true;
   Console.hide();

   if (Parameters.isGlobalTarget) {
      MixImages.load();
   }

   if (Parameters.isViewTarget) {
      MixImages.load();
      if( this.Show_N_Tell() ) {
         MixImages.save();
         this.Mix("MixedImage");
      } else {
         Console.criticalln( " Missing image specification ");
         return;
      }
      if( this.Iterate ) main();  // reopen with filled-in dialog
      return;
   }

    // execute via user interface
   let parametersDialog = new parametersDialogPrototype();
   Console.writeln("sending in ", MixImages.EquationNo);
   parametersDialog.update(MixImages.EquationNo);
   if( parametersDialog.execute() == 0 ) return;

   // normal execution via a dialog
   if( this.Show_N_Tell() ) {
      MixImages.save();
      this.MixedImage = this.Mix("MixedImage");
   } else {
      Console.criticalln( " Missing image specification ");
      Console.show();
      return;
   }
   Console.hide();

   if( MixImages.Iterate ) {
      main();  // reopen with filled-in dialog
   } else {
      Console.writeln ("DONE");
   }
} // end 'main'

main();



